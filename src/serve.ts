/** @ts-expect-error */
import swaggerUI from "../swagger/index.html";

import { file } from "bun";
import { authProvider } from "./auth-provider.js";
import { config } from "./config.js";
import { logger } from "./logger.js";
import openapi from "./openapi.js";
import { handlePingRequest } from "./ping.js";
import * as prometheus from "./prometheus.js";
import { BodySchema, TableInitSchema } from "./schemas.js";
import { makeSinkRequestHandler } from "./sink.js";
import { handleTableInitialization } from "./table-initialization.js";

type Handler = (req: Request) => Response | Promise<Response>;

function makeHandlers(): Record<string, Record<string, Handler>> {
  const handleSinkRequest = makeSinkRequestHandler(config.queueConcurrency, config.queueLimit);
  const { signed, authenticated } = authProvider({
    publicKey: config.publicKey,
    authKey: config.authKey,
  });

  return {
    GET: {
      "/": async () => new Response(await file(swaggerUI)),
      "/ping": () => handlePingRequest({ message: "PING" }),
      "/health": () => new Response("OK"),
      "/metrics": () => new Response(prometheus.registry),
      "/openapi": () => new Response(openapi),
    },
    POST: {
      "/": signed(BodySchema, async (body) => {
        if ("message" in body) {
          return handlePingRequest(body);
        } else {
          return handleSinkRequest(body);
        }
      }),
      "/schema": authenticated(TableInitSchema, handleTableInitialization),
    },
  };
}

export async function serve(port: number) {
  const handlers = makeHandlers();

  const app = Bun.serve({
    port,
    async fetch(request) {
      const { pathname } = new URL(request.url);
      const response = await handlers[request.method]?.[pathname]?.(request);
      return response ?? new Response("Invalid request", { status: 400 });
    },
  });

  logger.info(`Sink listening on http://${app.hostname}:${app.port}`);
}
