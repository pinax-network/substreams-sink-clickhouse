import { TableInitSchema } from "../schemas.js";
import { handleTableInitialization } from "../clickhouse/table-initialization.js";

export default async function (req: Request) {
    const body = await req.text();
    if (!body) return new Response("missing body", { status: 400 });
    try {
        const result = TableInitSchema.parse(body);
        return handleTableInitialization(result);
    } catch (e: any) {
        return new Response(e.message, { status: 400 });
    }
}
