import { logger } from "../logger.js";
import { Err, Ok, Result } from "../result.js";
import client from "./createClient.js";
import { augmentCreateTableStatement, getTableName } from "./table-utils.js";
import tables from "./tables/index.js";

export async function initializeDefaultTables(): Promise<Result> {
  const promiseResults = await Promise.allSettled(
    tables.map(([table, query]) => {
      logger.info(`CREATE TABLE [${table}]`);
      return client.command({ query });
    })
  );

  const rejectePromises = promiseResults.filter((promise) => promise.status === "rejected") as PromiseRejectedResult[];
  const reasons = rejectePromises.map((promise) => promise.reason);

  if (reasons.length > 0) {
    return Err(new Error(reasons.join(" | ")));
  }

  return Ok();
}

const extraColumns = [
  "id           String",
  "chain        LowCardinality(String)",
  "block_number UInt32",
  "block_id     FixedString(64)",
  "module_hash  FixedString(40)",
  "timestamp    DateTime64(3, 'UTC')",
];

const alterations = (tableName: string) => {
  return [
    `ALTER TABLE ${tableName} ADD INDEX timestamp_index timestamp TYPE minmax`,
    `ALTER TABLE ${tableName} ADD INDEX block_number_index block_number TYPE minmax`,
    `ALTER TABLE ${tableName} ADD INDEX chain_index chain TYPE minmax`,
  ];
};

export async function initializeTables(tableSchemas: string[]): Promise<Result<Array<string>>> {
  const executedSchemas = [];
  logger.info(`Executing ${tableSchemas.length} schema(s)`);

  try {
    for (const schema of tableSchemas) {
      const tableName = getTableName(schema);
      logger.info(`Executing '${tableName}'`);

      const augmentedSchema = augmentCreateTableStatement(schema, extraColumns);
      executedSchemas.push(augmentedSchema);

      await client.command({ query: augmentedSchema });
      for (const alteration of alterations(tableName)) {
        await client.command({ query: alteration });
      }
    }
  } catch (err) {
    logger.error("Could not initialize the tables", "Request: " + executedSchemas, err);
    return Err(new Error(JSON.stringify(err)));
  }

  logger.info("Complete.");
  return Ok(executedSchemas);
}
