import { client } from "../config.js";
import { logger } from "../logger.js";

export async function createDatabase(database: string) {
  if (!database) throw new Error("[database] is required");
  await client.exec({ query: `CREATE DATABASE IF NOT EXISTS "${database}"` });
  logger.info(`CREATE DATABASE [${database}]`);
}
