import { logger } from "../logger.js";
import { defaultClient } from "./createClient.js";

export async function createDatabase(database: string) {
  const query = `CREATE DATABASE IF NOT EXISTS "${database}"`;
  logger.info('[clickhouse::createDatabase]\t', `CREATE DATABASE [${database}]`);
  return {query, ...await defaultClient.exec({ query })};
}
