import { validateBearerAuth } from "./bearerAuth.js";
import init from "./init.js";
import schema from "./schema.js";

export default async function (req: Request): Promise<Response> {
  const { pathname } = new URL(req.url);
  const authError = validateBearerAuth(req);
  if (authError instanceof Response) return authError;

  if (pathname === "/schema/sql") return schema(req);
  if (pathname === "/schema/graphql") return new Response("Not implemented", { status: 501 });
  if (pathname === "/init") return init();
  return new Response("Not found", { status: 400 });
}
