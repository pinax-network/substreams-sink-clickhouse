import { file } from "bun";
import swaggerFavicon from "../../swagger/favicon.png";
import swaggerHtml from "../../swagger/index.html";
import { metrics } from "../prometheus.js";
import { blocks } from "./blocks.js";
import { NotFound, toFile, toJSON } from "./cors.js";
import { findCursorsForMissingBlocks, findLatestCursor } from "./cursors.js";
import health from "./health.js";
import openapi from "./openapi.js";

export default async function (req: Request) {
  const { pathname } = new URL(req.url);

  if (pathname === "/") return toFile(file(swaggerHtml));
  if (pathname === "/favicon.png") return toFile(file(swaggerFavicon));
  if (pathname === "/health") return health();
  if (pathname === "/metrics") return metrics();
  if (pathname === "/openapi") return toJSON(openapi);
  if (pathname === "/blocks") return blocks();
  if (pathname === "/cursors/latest") return findLatestCursor(req);
  if (pathname === "/cursors/missing") return findCursorsForMissingBlocks(req);

  return NotFound;
}
