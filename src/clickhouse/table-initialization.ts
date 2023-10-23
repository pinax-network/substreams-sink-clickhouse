// @ts-expect-error
import initialTablesFile from "./initial-tables.sql";

import { file } from "bun";
import { client } from "../config.js";
import { logger } from "../logger.js";
import { splitSchemaByTableCreation } from "./table-utils.js";

export async function initializeDefaultTables(): Promise<unknown> {
  const initialTables = await file(initialTablesFile).text();
  const queries = splitSchemaByTableCreation(initialTables);

  return Promise.allSettled(
    queries.map(({ tableName, query }) => {
      logger.info(`Initializing '${tableName}'.`);
      return client.command({ query });
    })
  );
}

const metadataQueries = (tableName: string) => [
  `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS id           String;`,
  `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS block_id     FixedString(64);`,
  `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS module_hash  FixedString(40);`,
  `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS chain        LowCardinality(String);`,
  `ALTER TABLE ${tableName} ADD INDEX IF NOT EXISTS manifest_index (chain, module_hash) TYPE minmax`,
  `ALTER TABLE ${tableName} ADD INDEX IF NOT EXISTS block_index (chain, block_id) TYPE minmax`,
];

export async function initializeTables(schema: string): Promise<string[]> {
  logger.info("Executing schema");
  const tables = splitSchemaByTableCreation(schema);
  logger.info(
    `Found ${tables.length} table(s): ${tables.map(({ tableName }) => `'${tableName}'`).join(", ")}`
  );

  try {
    for (const { tableName, query } of tables) {
      logger.info(`Executing '${tableName}'`);

      await client.command({ query });
      for (const query of metadataQueries(tableName)) {
        await client.command({ query });
      }
    }
  } catch (err) {
    logger.error("Could not initialize the tables.");
    logger.error("Request: " + schema);
    logger.error(err);
    throw err;
  }

  logger.info("Complete.");
  return tables.map((table) => table.tableName);
}

export async function readSchema(schemaUrl: string): Promise<string> {
  logger.info(`Reading '${schemaUrl}'.`);

  try {
    const file = Bun.file(schemaUrl);
    if (await file.exists()) {
      return file.text();
    }

    const response = await fetch(new URL(schemaUrl));
    return response.text();
  } catch {
    logger.error("could not find the requested schema. Is it valid?");
    process.exit(1);
  }
}
