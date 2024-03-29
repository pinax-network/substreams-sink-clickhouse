import { pause } from "../clickhouse/stores.js";
import { NotFound, toText } from "./cors.js";
import init from "./init.js";
import { handleSchemaRequest } from "./schema.js";

export default async function (req: Request): Promise<Response> {
  const { pathname } = new URL(req.url);

  try {
    if (pathname === "/init") return await init();
    if (pathname === "/schema/sql") return handleSchemaRequest(req, "sql");
    if (pathname === "/schema/graphql") return handleSchemaRequest(req, "graphql");
    if (pathname === "/pause") return toText(String(pause(true)));
    if (pathname === "/unpause") return toText(String(pause(false)));
  } catch (e) {
    console.error(e);
    return toText(String(e), 500);
  }

  return NotFound;
}
