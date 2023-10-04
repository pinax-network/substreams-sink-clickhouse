import { Type } from "@sinclair/typebox";
import { banner } from "./banner.js";
import { client } from "./clickhouse.js";
import config from "./config.js";
import { logger } from "./logger.js";
import * as prometheus from "./prometheus.js";
import type { Handler } from "./types.js";
import { withValidatedRequest } from "./verify.js";

enum EntityChange_Operation {
  UNSPECIFIED = "OPERATION_UNSPECIFIED",
  CREATE = "OPERATION_CREATE",
  UPDATE = "OPERATION_UPDATE",
  DELETE = "OPERATION_DELETE",
  FINAL = "OPERATION_FINAL",
}

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
    data: Type.Object({ entityChanges: Type.Array(Type.Unknown()) }),
  }),
]);

const handlers: Record<string, Record<string, Handler>> = {
  GET: {
    "/": () => new Response(banner()),
    "/health": () => new Response("OK"),
    "/metrics": () => new Response(prometheus.registry),
  },
  POST: {
    "/": withValidatedRequest(BodySchema, async (payload) => {
      if (!payload.success) {
        logger.error(
          "The received payload did not have the planned structure.",
          payload.errors
        );
        return new Response();
      }

      const { body } = payload;
      if ("message" in body) {
        if (body.message === "PING") {
          return new Response("OK");
        }
        return new Response("invalid body", { status: 400 });
      }

      const changes = body.data.entityChanges as any[]; // EntityChange[];
      if (changes.length === 0) {
        // Skip this data since it is does not contain any useful information
        return new Response();
      }

      for (const change of changes) {
        switch (change.operation) {
          case EntityChange_Operation.CREATE: {
            const values = change.fields.reduce(
              (previous: any, field: any) => ({
                ...previous,
                [field.name]: Object.values(field.newValue)[0],
              }),
              {}
            );

            await client.insert({
              table: change.entity,
              values,
              format: "JSONEachRow",
            });

            break;
          }
          case EntityChange_Operation.UPDATE:
            logger.warn("operation not implemented");
            break;
          case EntityChange_Operation.DELETE:
            logger.warn("operation not implemented");
            break;
          default:
            logger.error(
              "unsupported operation found in entityChanges: " +
                change.operation.toString()
            );
            break;
        }
      }

      return new Response();
    }),
  },
};

export function serveSink() {
  const app = Bun.serve({
    port: config.PORT,
    async fetch(request) {
      const { pathname } = new URL(request.url);
      const response = await handlers[request.method]?.[pathname]?.(request);
      return response ?? new Response("Invalid request", { status: 400 });
    },
  });

  logger.info(`Sink listening on port ${app.port}`);
}
