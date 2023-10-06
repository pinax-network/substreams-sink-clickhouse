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
  logger.info("Complete.");
}
