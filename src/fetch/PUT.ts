import * as argon2 from "../auth/argon2.js";
import { NoAuthorization, getBearer } from "../auth/bearer.js";
import { NotFound } from "./cors.js";
import init from "./init.js";
import { handleSchemaRequest } from "./schema.js";

export default async function (req: Request): Promise<Response> {
  const { pathname } = new URL(req.url);

  const bearer = getBearer(req);
  if (!bearer) return NoAuthorization;

  const error = argon2.beforeHandle(req);
  if (error instanceof Error) return error;

  if (pathname === "/init") return init();
  if (pathname === "/schema/sql") return handleSchemaRequest(req, "sql");
  if (pathname === "/schema/graphql") return handleSchemaRequest(req, "graphql");

  return NotFound;
}
