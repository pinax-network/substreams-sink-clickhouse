import { logger } from "../logger.js";
import { client } from "./createClient.js";

export async function createDatabase(database: string) {
  if (!database) {
    throw new Error("[database] is required")
  }
  logger.info('[clickhouse::createDatabase]\t', `CREATE DATABASE [${database}]`);
  const query = `CREATE DATABASE IF NOT EXISTS "${database}"`;
  return {query, ...await client.exec({ query })};
}
