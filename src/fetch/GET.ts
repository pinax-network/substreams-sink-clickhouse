// @ts-expect-error
import swaggerUI from "../../swagger/index.html";
// @ts-expect-error
import favicon from "../../swagger/favicon.png";

import { file } from "bun";
import { registry } from "../prometheus.js";
import health from "./health.js";
import openapi from "./openapi.js";

export default async function (req: Request) {
  const { pathname } = new URL(req.url);

  if (pathname === "/") return new Response(file(swaggerUI));
  if (pathname === "/favicon.png") return new Response(file(favicon));
  if (pathname === "/health") return health(req);
  if (pathname === "/metrics")
    return new Response(await registry.metrics(), {
      headers: { "Content-Type": registry.contentType },
    });
  if (pathname === "/openapi")
    return new Response(openapi, { headers: { "Content-Type": "application/json" } });

  return new Response("Not found", { status: 400 });
}
