import { initializeTables } from "../clickhouse/table-initialization.js";
import { splitSchemaByTableCreation } from "../clickhouse/table-utils.js";
import { ClickhouseTableBuilder } from "../graphql/builders/clickhouse-table-builder.js";
import { TableTranslator } from "../graphql/table-translator.js";
import { logger } from "../logger.js";
import { TableInitSchema } from "../schemas.js";

const clickhouseBuilder = new ClickhouseTableBuilder();

export async function handleSchemaRequest(req: Request, type: "sql" | "graphql") {
  const body = await req.text();
  if (!body) {
    return new Response("missing body", { status: 400 });
  }

  const result = TableInitSchema.safeParse(body);
  if (!result.success) {
    return new Response(result.error.toString(), { status: 400 });
  }

  let tableSchemas: string[] = [];
  if (type === "sql") {
    tableSchemas = splitSchemaByTableCreation(result.data);
  } else if (type === "graphql") {
    tableSchemas = TableTranslator.translate(result.data, clickhouseBuilder);
  }

  logger.info(`Found ${tableSchemas.length} table(s)`);

  try {
    await initializeTables(tableSchemas);
    return new Response(JSON.stringify({ status: "OK", schema: tableSchemas.join("\n\n") }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(`Could not create the tables: ${err}`, { status: 500 });
  }
}
