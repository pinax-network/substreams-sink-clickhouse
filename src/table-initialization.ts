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
  `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS timestamp    DateTime('UTC');`,
  `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS block_number UInt32;`,
  `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS block_id     FixedString(64);`,
  `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS chain        LowCardinality(String);`,
  `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS module_hash  FixedString(40);`,
];

export async function handleTableInitialization({ schema }: TableInitSchema): Promise<Response> {
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
    return new Response("Could not create the tables: " + err, { status: 500 });
  }

  logger.info("Complete.");
  return new Response();
}
