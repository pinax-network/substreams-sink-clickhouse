import { file } from "bun";
import swaggerFavicon from "../../swagger/favicon.png";
import swaggerHtml from "../../swagger/index.html";
import { metrics } from "../prometheus.js";
import { blocks } from "../../sql/blocks.js";
import { NotFound, toFile, toJSON, toText } from "./cors.js";
import { findLatestCursor } from "../../sql/cursor.js";
import health from "./health.js";
import { openapi } from "./openapi.js";
import { cluster } from "../../sql/cluster.js";

export default async function (req: Request): Promise<Response> {
  const { pathname } = new URL(req.url);

  try {
    if (pathname === "/") return toFile(file(swaggerHtml));
    if (pathname === "/favicon.png") return toFile(file(swaggerFavicon));

    // queries
    if (pathname === "/cursor/latest") return toText(await findLatestCursor(req));

    // health
    if (pathname === "/blocks") return toJSON(await blocks(req));
    if (pathname === "/cluster") return toJSON(await cluster());
    if (pathname === "/health") return health();
    if (pathname === "/metrics") return metrics();

    // docs
    if (pathname === "/openapi") return toJSON(await openapi());
  } catch (e) {
    return toText(String(e), 500);
  }

  return NotFound;
}
