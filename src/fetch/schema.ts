import { initializeTables } from "../clickhouse/table-initialization.js";
import { TableInitSchema } from "../schemas.js";

export async function handleSchemaRequest(req: Request, type: "sql" | "graphql") {
  const body = await req.text();
  if (!body) {
    return new Response("missing body", { status: 400 });
  }

  const result = TableInitSchema.safeParse(body);
  if (!result.success) {
    return new Response(result.error.toString(), { status: 400 });
  }

  let schema = result.data;
  if (type === "graphql") {
    // TODO: import graphql -> sql code
    return new Response("Not implemented", { status: 501 });
  }

  try {
    await initializeTables(schema);
    return new Response(JSON.stringify({ status: "OK", schema }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(`Could not create the tables: ${err}`, { status: 500 });
  }
}
