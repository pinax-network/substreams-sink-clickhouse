import schema from "./schema.js";
import init from "./init.js";
import { validateBearerAuth } from "./bearerAuth.js";

export default async function (req: Request):Promise<Response> {
    const { pathname} = new URL(req.url);
    const authError = validateBearerAuth(req);
    if ( authError instanceof Response ) return authError;

    if ( pathname === "/schema") return schema(req);
    if ( pathname === "/init") return init(req);
    return new Response("Not found", { status: 400 });
}
