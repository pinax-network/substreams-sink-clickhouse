import schema from "./schema.js";
import init from "./init.js";

export default async function (req: Request) {
    const { pathname} = new URL(req.url);
    // TO-DO: add Basic Auth
    // use Hono Basic Auth middleware
    // https://hono.dev/middleware/builtin/basic-auth

    if ( pathname === "/schema") return schema(req);
    if ( pathname === "/init") return init(req);
    return new Response("Not found", { status: 400 });
}
