import { client } from "./clickhouse.js";
import { logger } from "./logger.js";
import { TableInitSchema } from "./schemas.js";
import { splitSchemaByTableCreation } from "./table-utils.js";

const query = `
CREATE TABLE IF NOT EXISTS manifest (
    module_hash FixedString(40),
    module_name String(),
    type        String(),
)
ENGINE = ReplacingMergeTree 
ORDER BY (module_hash);
`;

export function initializeManifest(): Promise<unknown> {
  logger.info("Initializing 'manifest' table.");
  return client.command({ query });
}

const metadataQueries = (tableName: string) => [
  `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS entity_id    String;`,
  `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS timestamp    DateTime('UTC');`,
  `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS block_number UInt32;`,
  `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS block_id     FixedString(64);`,
  `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS chain        LowCardinality(String);`,
  `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS module_hash  FixedString(40);`,
  `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS final_block  Bool;`,
  `ALTER TABLE ${tableName} ADD INDEX  IF NOT EXISTS metadata_index (chain, module_hash) TYPE minmax`,
];

export async function handleTableInitialization(schema: TableInitSchema): Promise<Response> {
  try {
    const tables = await initializeTables(schema);
    return new Response("OK\nProcessed tables: " + tables);
  } catch (err) {
    return new Response("Could not create the tables: " + err, { status: 500 });
  }
}

export async function initializeTables(schema: string): Promise<string[]> {
  logger.info("Executing schema.");
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
