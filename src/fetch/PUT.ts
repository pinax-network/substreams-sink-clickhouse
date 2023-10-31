import { validateBearerAuth } from "./bearerAuth.js";
import { NotFound } from "./cors.js";
import init from "./init.js";
import { handleSchemaRequest } from "./schema.js";

export default async function (req: Request): Promise<Response> {
  const { pathname } = new URL(req.url);
  const authError = validateBearerAuth(req);
  if (authError instanceof Response) {
    return authError;
  }

  if (pathname === "/init") return init();
  if (pathname === "/schema/sql") return handleSchemaRequest(req, "sql");
  if (pathname === "/schema/graphql") return handleSchemaRequest(req, "graphql");

  return NotFound;
}
