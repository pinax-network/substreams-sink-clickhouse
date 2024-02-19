import { logger } from "../logger.js";
import { client } from "./createClient.js";
import { databases } from "./stores.js";

export async function createDatabase(database: string) {
  // if (!database) {
  //   throw new Error("[database] is required")
  // }
  // if ( databases?.has(database) ) return {};
  const query = `CREATE DATABASE IF NOT EXISTS "${database}"`;
  logger.info('[clickhouse::createDatabase]\t', `CREATE DATABASE [${database}]`);
  return {query, ...await client.exec({ query })};
}
