import { logger } from "../logger.js";
import { client } from "./createClient.js";
import { augmentCreateTableStatement, getTableName, isCreateTableStatement } from "./table-utils.js";
import { sqlTables } from "../../sql/tables/tables.js";
import { tables } from "./stores.js";

export async function initializeDefaultTables() {
  const results = [];
  for ( const [ table, query ] of sqlTables ) {
    if ( tables?.has(table) ) continue;
    logger.info('[clickhouse::initializeDefaultTables]\t', `CREATE TABLE [${table}]`);
    results.push({table, query, ...await client.exec({ query })});
  }
  return results;
}

const extraColumns = [
  "id           String",
  "chain        LowCardinality(String)",
  "block_number UInt32",
  "block_id     FixedString(64)",
  "module_hash  FixedString(40)",
  "timestamp    DateTime64(3, 'UTC')",
  "operation    LowCardinality(String)",
];

const add_indexes = (tableName: string) => {
  return [
    `ALTER TABLE ${tableName} ADD INDEX IF NOT EXISTS timestamp_index timestamp TYPE minmax`,
    `ALTER TABLE ${tableName} ADD INDEX IF NOT EXISTS block_number_index block_number TYPE minmax`,
    `ALTER TABLE ${tableName} ADD INDEX IF NOT EXISTS chain_index chain TYPE minmax`,
  ];
};

export async function executeCreateStatements(statements: string[]) {
  const executedStatements = [];
  logger.info('[clickhouse::executeCreateStatements]', `Executing ${statements.length} statement(s)`);

  for (const statement of statements) {
    const tableName = getTableName(statement);
    logger.info('[clickhouse::executeCreateStatements]', `Executing '${tableName}'`);

    // ignore non-create statements
    if (!isCreateTableStatement(statement)) {
      executedStatements.push(statement);
      await client.exec({ query: statement });
      continue;
    }

    // ADD FIELDS
    const augmentedStatement = augmentCreateTableStatement(statement, extraColumns);
    executedStatements.push(augmentedStatement);
    await client.exec({ query: augmentedStatement });

    // ADD INDEX
    for (const add_index of add_indexes(tableName)) {
      executedStatements.push(add_index);
      await client.exec({ query: add_index });
    }
  }
  if ( executedStatements.length == 0 ) throw new Error("No statements executed");
  logger.info('[clickhouse::executeCreateStatements]', "Complete.");
  return executedStatements;
}
