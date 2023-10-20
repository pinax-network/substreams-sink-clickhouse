import { Server } from "bun";
import { TableInitSchema } from "../schemas.js";
import { handleTableInitialization } from "../clickhouse/table-initialization.js";

export default async function (req: Request, server: Server) {
    const { pathname} = new URL(req.url);
    if ( pathname === "/schema") {
        const body = await req.text();
        if (!body) return new Response("missing body", { status: 400 });
        const result = TableInitSchema.parse(body);
        return handleTableInitialization(result);
    }
    return new Response("Not found", { status: 400 });
}
