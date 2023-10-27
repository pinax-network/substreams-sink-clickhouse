import { logger } from "../logger.js";
import client from "./createClient.js";
import { getTableName } from "./table-utils.js";
import tables from "./tables/index.js";

export function initializeDefaultTables(): Promise<unknown> {
  return Promise.all(
    tables.map(([table, query]) => {
      logger.info(`CREATE TABLE [${table}]`);
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

export async function initializeTables(tableSchemas: string[]): Promise<void> {
  logger.info("Executing schema");

  try {
    for (const schema of tableSchemas) {
      const tableName = getTableName(schema);
      logger.info(`Executing '${tableName}'`);

      await client.command({ query: schema });
      for (const query of metadataQueries(tableName)) {
        await client.command({ query });
      }
    }
  } catch (err) {
    logger.error("Could not initialize the tables.");
    logger.error("Request: " + tableSchemas);
    logger.error(err);
    throw err;
  }

  logger.info("Complete.");
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
