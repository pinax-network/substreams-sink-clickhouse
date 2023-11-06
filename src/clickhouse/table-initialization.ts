import { logger } from "../logger.js";
import client from "./createClient.js";
import { augmentCreateTableStatement, getTableName } from "./table-utils.js";
import tables from "./tables/index.js";

export function initializeDefaultTables(): Promise<unknown> {
  return Promise.all(
    tables.map(([table, query]) => {
      logger.info(`CREATE TABLE [${table}]`);
      return client.command({ query });
    })
  );
}

const extraColumns = [
  "id           String",
  "chain        LowCardinality(String)",
  "block_id     FixedString(64)",
  "block_number UInt32",
  "module_hash  FixedString(40)",
  "timestamp    DateTime64(3, 'UTC')",
  "cursor       String",
];

export async function initializeTables(tableSchemas: string[]): Promise<Array<string>> {
  const executedSchemas = [];
  logger.info("Executing schema");

  try {
    for (const schema of tableSchemas) {
      const tableName = getTableName(schema);
      logger.info(`Executing '${tableName}'`);

      const augmentedSchema = augmentCreateTableStatement(schema, extraColumns);
      executedSchemas.push(augmentedSchema);

      await client.command({ query: augmentedSchema });
    }
  } catch (err) {
    logger.error("Could not initialize the tables.");
    logger.error("Request: " + executedSchemas);
    logger.error(err);
    throw err;
  }

  logger.info("Complete.");
  return executedSchemas;
}
