import { store } from "../clickhouse/stores.js";
import { initializeTables } from "../clickhouse/table-initialization.js";
import { splitSchemaByTableCreation } from "../clickhouse/table-utils.js";
import { ClickhouseTableBuilder } from "../graphql/builders/clickhouse-table-builder.js";
import { TableTranslator } from "../graphql/table-translator.js";
import { logger } from "../logger.js";
import { TableInitSchema } from "../schemas.js";
import { BadRequest, toJSON, toText } from "./cors.js";

const clickhouseBuilder = new ClickhouseTableBuilder();

export async function handleSchemaRequest(req: Request, type: "sql" | "graphql") {
  const schema = await getSchemaFromRequest(req);
  if (schema instanceof Response) {
    return schema;
  }

  let tableSchemas: string[] = [];
  if (type === "sql") {
    tableSchemas = splitSchemaByTableCreation(schema);
  } else if (type === "graphql") {
    tableSchemas = TableTranslator.translate(schema, clickhouseBuilder);
  }

  logger.info(`Found ${tableSchemas.length} table(s)`);

  try {
    const executedSchemas = await initializeTables(tableSchemas);
    store.reset();
    return toJSON({ status: "OK", schema: executedSchemas.join("\n\n") });
  } catch (err) {
    logger.error(err);
    return toText("Could not create the tables", 500);
  }
}

// This looks for a table schema in the request object.
// In order of priority:
//   1. query param ?schema-url=
//    a. local file system
//    b. remote file
//   2. body (as raw sql)
async function getSchemaFromRequest(req: Request): Promise<Response | string> {
  try {
    const url = new URL(req.url);
    const schemaUrl = url.searchParams.get("schema-url");

    if (schemaUrl) {
      const file = Bun.file(schemaUrl);
      if (await file.exists()) {
        return file.text();
      }

      const response = await fetch(new URL(schemaUrl));
      return response.text();
    }

    const body = await req.text();
    if (!body) {
      return toText("missing body", 400);
    }

    return TableInitSchema.parse(body);
  } catch (e) {
    logger.error(e);
  }

  return BadRequest;
}
