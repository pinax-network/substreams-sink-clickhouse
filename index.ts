import { Type } from "@sinclair/typebox";
import { banner } from "./src/banner.js";
import { PORT } from "./src/config.js";
import * as prometheus from "./src/prometheus.js";
import { withValidatedRequest } from "./src/verify.js";

type Awaitable<T> = T | Promise<T>;
type Handler = (req: Request) => Awaitable<Response>;

const BodySchema = Type.Union([Type.Object({ message: Type.Literal("PING") })]);

const handlers: Record<string, Record<string, Handler>> = {
  GET: {
    "/": () => new Response(banner()),
    "/health": () => new Response("OK"),
    "/metrics": () => new Response(prometheus.registry),
  },
  POST: {
    "/": withValidatedRequest(BodySchema, (body) => {
      if (body.message === "PING") {
        return new Response("OK");
      }

      return new Response("?");
    }),
  },
};

Bun.serve({
  port: PORT,
  async fetch(request) {
    const { pathname } = new URL(request.url);
    const response = await handlers[request.method]?.[pathname]?.(request);

    return response ?? new Response("Invalid request", { status: 400 });
  },
});
