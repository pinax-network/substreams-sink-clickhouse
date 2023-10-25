import { file } from "bun";
import swaggerFavicon from "../../swagger/favicon.png";
import swaggerHtml from "../../swagger/index.html";
import { registry } from "../prometheus.js";
import { blocks } from "./blocks.js";
import health from "./health.js";
import openapi from "./openapi.js";

export default async function (req: Request) {
  const { pathname } = new URL(req.url);

  if (pathname === "/") return new Response(file(swaggerHtml));
  if (pathname === "/favicon.png") return new Response(file(swaggerFavicon));
  if (pathname === "/health") return health(req);
  if (pathname === "/metrics") return new Response(await registry.metrics(), { headers: { "Content-Type": registry.contentType } });
  if (pathname === "/openapi") return new Response(openapi, { headers: { "Content-Type": "application/json" } });
  if (pathname === "/blocks") return blocks();

  return new Response("Not found", { status: 400 });
}
