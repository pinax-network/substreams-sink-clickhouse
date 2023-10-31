import { initializeTables } from "../clickhouse/table-initialization.js";
import { splitSchemaByTableCreation } from "../clickhouse/table-utils.js";
import { ClickhouseTableBuilder } from "../graphql/builders/clickhouse-table-builder.js";
import { TableTranslator } from "../graphql/table-translator.js";
import { logger } from "../logger.js";
import { TableInitSchema } from "../schemas.js";
import { toJSON, toText } from "./cors.js";

const clickhouseBuilder = new ClickhouseTableBuilder();

export async function handleSchemaRequest(req: Request, type: "sql" | "graphql") {
  const body = await req.text();
  if (!body) {
    return toText("missing body", 400);
  }

  const result = TableInitSchema.safeParse(body);
  if (!result.success) {
    return toText("Bad request: " + result.error.toString(), 400);
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
    return toJSON({ status: "OK", schema: tableSchemas.join("\n\n") });
  } catch (err) {
    logger.error(err);
    return toText("Could not create the tables", 500);
  }
}
