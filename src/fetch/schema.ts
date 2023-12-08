import { store } from "../clickhouse/stores.js";
import { executeCreateStatements } from "../clickhouse/table-initialization.js";
import { splitCreateStatement } from "../clickhouse/table-utils.js";
import { ClickhouseTableBuilder } from "../graphql/builders/clickhouse-table-builder.js";
import { TableTranslator } from "../graphql/table-translator.js";
import { logger } from "../logger.js";
import { Err, Ok, Result } from "../result.js";
import { TableInitSchema } from "../schemas.js";
import { BadRequest, toJSON, toText } from "./cors.js";

const clickhouseBuilder = new ClickhouseTableBuilder();

export async function handleSchemaRequest(req: Request, type: "sql" | "graphql") {
  const schemaResult = await getSchemaFromRequest(req);
  if (!schemaResult.success) {
    return schemaResult.error;
  }

  let statements: string[] = [];
  if (type === "sql") {
    statements = splitCreateStatement(schemaResult.payload);
  } else if (type === "graphql") {
    statements = TableTranslator.translate(schemaResult.payload, clickhouseBuilder);
  }

  logger.info(`Found ${statements.length} statement(s)`);

  const executedSchemas = await executeCreateStatements(statements);
  if (!executedSchemas.success) {
    return toText("Could not execute the statements", 500);
  }

  store.reset();
  return toJSON({ status: "OK", schema: executedSchemas.payload.join("\n") });
}

// This looks for a table schema in the request object.
// In order of priority:
//   1. query param ?schema-url=
//    a. local file system
//    b. remote file
//   2. body (as raw sql)
async function getSchemaFromRequest(req: Request): Promise<Result<string, Response>> {
  try {
    const url = new URL(req.url);
    const schemaUrl = url.searchParams.get("schema-url");

    if (schemaUrl) {
      const file = Bun.file(schemaUrl);
      if (await file.exists()) {
        return Ok(await file.text());
      }

      const response = await fetch(new URL(schemaUrl));
      return Ok(await response.text());
    }

    const body = await req.text();
    if (!body) {
      return Err(toText("missing body", 400));
    }

    return Ok(TableInitSchema.parse(body));
  } catch (e) {
    logger.error(e);
  }

  return Err(BadRequest);
}
