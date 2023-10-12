import { client } from "../clickhouse.js";
import { logger } from "../logger.js";
import { splitSchemaByTableCreation } from "../table-utils.js";

const metadataQueries = (tableName: string) => [
  `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS timestamp    DateTime('UTC');`,
  `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS block_number UInt32;`,
  `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS block_id     FixedString(64);`,
  `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS chain        LowCardinality(String);`,
  `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS module_hash  FixedString(40);`,
];

export async function executeInitialSchema(schemaPath: string) {
  const file = Bun.file(schemaPath || "./schema.sql");
  if (!(await file.exists())) {
    logger.error(`could not find the requested file: '${schemaPath}'`);
    process.exit(1);
  }

  logger.info("Executing schema.");
  const schema = await file.text();
  const tables = splitSchemaByTableCreation(schema);
  logger.info(
    `Found ${tables.length} table(s): ${tables
      .map(({ tableName }) => `'${tableName}'`)
      .join(", ")}`
  );

  for (const { tableName, query } of tables) {
    logger.info(`Executing '${tableName}'`);

    await client.command({ query });
    for (const query of metadataQueries(tableName)) {
      await client.command({ query });
    }
  }

  logger.info("Complete.");
}
