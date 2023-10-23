import { initializeTables } from "../clickhouse/table-initialization.js";
import { TableInitSchema } from "../schemas.js";

export default async function (req: Request) {
  const body = await req.text();
  if (!body) {
    return new Response("missing body", { status: 400 });
  }

  const result = TableInitSchema.safeParse(body);
  if (!result.success) {
    return new Response(result.error.toString(), { status: 400 });
  }

  try {
    await initializeTables(result.data);
    return new Response("OK");
  } catch (err) {
    return new Response(`Could not create the tables: ${err}`, { status: 500 });
  }
}
