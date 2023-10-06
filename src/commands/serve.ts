import { Type } from "@sinclair/typebox";
import {
  EntityChange,
  EntityChanges,
} from "@substreams/sink-entity-changes/typebox";
import { banner } from "../banner.js";
import { client } from "../clickhouse.js";
import config from "../config.js";
import { getValuesInEntityChange } from "../entity-changes.js";
import { logger } from "../logger.js";
import * as prometheus from "../prometheus.js";
import { authProvider } from "../verify.js";

const BodySchema = Type.Union([
  Type.Object({ message: Type.Literal("PING") }),
  Type.Object({
    cursor: Type.String(),
    session: Type.Object({
      traceId: Type.String(),
      resolvedStartBlock: Type.Number(),
    }),
    clock: Type.Object({
      timestamp: Type.String(),
      number: Type.Number(),
      id: Type.String(),
    }),
    manifest: Type.Object({
      substreamsEndpoint: Type.String(),
      moduleName: Type.String(),
      type: Type.String(),
      moduleHash: Type.String(),
      chain: Type.String(),
    }),
    data: EntityChanges,
  }),
]);

const { validated } = authProvider(config.PUBLIC_KEY);

type Handler = (req: Request) => Response | Promise<Response>;
const handlers: Record<string, Record<string, Handler>> = {
  GET: {
    "/": () => new Response(banner()),
    "/health": () => new Response("OK"),
    "/metrics": () => new Response(prometheus.registry),
  },
  POST: {
    "/": validated(BodySchema, async (payload) => {
      if (!payload.success) {
        logger.error(
          "The received payload did not have the planned structure.",
          payload.errors
        );
        return new Response();
      }

      if ("message" in payload.body) {
        if (payload.body.message === "PING") {
          return new Response("OK");
        }
        return new Response("invalid body", { status: 400 });
      }

      const changes = payload.body.data.entityChanges;
      const promises = changes.map(handleEntityChange);
      await Promise.allSettled(promises);

      return new Response();
    }),
  },
};

function handleEntityChange(change: EntityChange): Promise<unknown> {
  const values = getValuesInEntityChange(change);

  switch (change.operation) {
    case "OPERATION_CREATE":
      return client.insert({
        values,
        table: change.entity,
        format: "JSONEachRow",
      });

    default:
      logger.error(
        "unsupported operation found in entityChanges: " +
          change.operation.toString()
      );
      return Promise.resolve();
  }
}

export function serveSink(port: number) {
  const app = Bun.serve({
    port,
    async fetch(request) {
      const { pathname } = new URL(request.url);
      const response = await handlers[request.method]?.[pathname]?.(request);
      return response ?? new Response("Invalid request", { status: 400 });
    },
  });

  logger.info(`Sink listening on port ${app.port}`);
}
