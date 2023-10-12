import { banner } from "./banner.js";
import config from "./config.js";
import { logger } from "./logger.js";
import * as prometheus from "./prometheus.js";
import { BodySchema } from "./schemas.js";
import { authProvider } from "./verify.js";

const { validated } = authProvider(config.PUBLIC_KEY);

type Handler = (req: Request) => Response | Promise<Response>;
const handlers: Record<string, Record<string, Handler>> = {
  GET: {
    "/": () => new Response(banner()),
    "/health": () => new Response("OK"),
    "/metrics": () => new Response(prometheus.registry),
  },
  POST: {
    "/": validated(BodySchema, async () => new Response("TODO")),
  },
};

export async function serveSink(port: number) {
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
