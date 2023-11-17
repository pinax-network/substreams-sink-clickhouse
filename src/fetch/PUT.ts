import * as argon2 from "../auth/argon2.js";
import { NotFound } from "./cors.js";
import init from "./init.js";
import { handlePause } from "./pause.js";
import { handleSchemaRequest } from "./schema.js";

export default async function (req: Request): Promise<Response> {
  const { pathname } = new URL(req.url);

  const error = argon2.beforeHandle(req);
  if (error instanceof Response) return error;

  if (pathname === "/init") return init();
  if (pathname === "/schema/sql") return handleSchemaRequest(req, "sql");
  if (pathname === "/schema/graphql") return handleSchemaRequest(req, "graphql");
  if (pathname === "/pause") return handlePause(true);
  if (pathname === "/unpause") return handlePause(false);

  return NotFound;
}
