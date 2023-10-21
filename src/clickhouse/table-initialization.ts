import { client } from "../config.js";
import { logger } from "../logger.js";
import { TableInitSchema } from "../schemas.js";
import { splitSchemaByTableCreation } from "./table-utils.js";

const queries = [
  `
CREATE TABLE IF NOT EXISTS manifest (
    module_hash   FixedString(40),
    module_name   String(),
    chain         LowCardinality(String),
    type          String(),
)
ENGINE = ReplacingMergeTree
ORDER BY (module_hash);
`,
  `
CREATE TABLE IF NOT EXISTS block (
  block_id      FixedString(64),
  block_number  UInt32(),
  chain         LowCardinality(String),
  timestamp     DateTime64(3, 'UTC'),
  final_block   Bool,
)
ENGINE = ReplacingMergeTree
PRIMARY KEY (block_id)
ORDER BY (block_id, block_number, timestamp);
`,
  `CREATE TABLE IF NOT EXISTS unparsed_json (
    raw_data    JSON,
    source      LowCardinality(String),
    id          String,
    block_id    FixedString(64),
    module_hash FixedString(40),
    chain       LowCardinality(String)
  )
  ENGINE = MergeTree
  ORDER BY (source, chain, module_hash, block_id)`,
];

export function initializeManifest(): Promise<unknown> {
  logger.info("Initializing 'manifest' table.");
  logger.info("Initializing 'clock' table.");
  logger.info("Initializing 'unparsed_json' table.");
  return Promise.all(queries.map((query) => client.command({ query })));
}

const metadataQueries = (tableName: string) => [
  `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS id           String;`,
  `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS block_id     FixedString(64);`,
  `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS module_hash  FixedString(40);`,
  `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS chain        LowCardinality(String);`,
  `ALTER TABLE ${tableName} ADD INDEX IF NOT EXISTS manifest_index (chain, module_hash) TYPE minmax`,
  `ALTER TABLE ${tableName} ADD INDEX IF NOT EXISTS block_index (chain, block_id) TYPE minmax`,
];

export async function handleTableInitialization(schema: TableInitSchema): Promise<Response> {
  try {
    await initializeTables(schema);
    return new Response("OK");
  } catch (err) {
    return new Response(`Could not create the tables: ${err}`, { status: 500 });
  }
}

export async function initializeTables(schema: string): Promise<string[]> {
  logger.info("Executing schema");
  const tables = splitSchemaByTableCreation(schema);
  logger.info(`Found ${tables.length} table(s): ${tables.map(({ tableName }) => `'${tableName}'`).join(", ")}`);

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
