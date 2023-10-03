import { Type } from "@sinclair/typebox";
import { banner } from "./banner.js";
import config from "./config.js";
import { logger } from "./logger.js";
import * as prometheus from "./prometheus.js";
import type { Handler } from "./types.js";
import { withValidatedRequest } from "./verify.js";

const BodySchema = Type.Union([
  Type.Object({ message: Type.Literal("PING") }),
  Type.Object({
    timestamp: Type.Date(),
    signature: Type.String(),
    body: Type.Unknown(),
  }),
]);

const handlers: Record<string, Record<string, Handler>> = {
  GET: {
    "/": () => new Response(banner()),
    "/health": () => new Response("OK"),
    "/metrics": () => new Response(prometheus.registry),
  },
  POST: {
    "/": withValidatedRequest(BodySchema, (body) => {
      if ("message" in body) {
        if (body.message === "PING") {
          return new Response("OK");
        }
        return new Response("invalid body", { status: 400 });
      }

      //   body.
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
