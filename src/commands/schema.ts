import { client } from "../clickhouse.js";
import { logger } from "../logger.js";

export async function executeInitialSchema(schemaPath: string) {
  const file = Bun.file(schemaPath || "./schema.sql");
  if (!(await file.exists())) {
    logger.error(`could not find the requested file: '${schemaPath}'`);
    process.exit(1);
  }

  logger.info("Executing schema.");
  const schema = await file.text();
  await client.command({ query: schema });

  // Based on the table creation syntax found here:
  // https://clickhouse.com/docs/en/sql-reference/statements/create/table
  const tableName = schema
    .replaceAll(/\([\s\S]*\)[\s\S]*/g, "") // Remove body and everything after
    .replace("CREATE TABLE", "") // Remove 'CREATE TABLE'
    .replace("IF NOT EXISTS", "") // Remove 'IF NOT EXISTS' if it is present
    .replace(/ON .*/, "") // Remove 'ON [cluster] if it is present
    .split(".") // The result will be '[db].TableName'
    .reverse()[0]; // Keep only the last part: 'TableName'

  const queries = [
    `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS timestamp DateTime('UTC');`,
    `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS block_number UInt32;`,
    `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS block_id String(64);`,
  ];
  for (const query of queries) {
    await client.command({ query });
  }

  logger.info("Complete.");
}
