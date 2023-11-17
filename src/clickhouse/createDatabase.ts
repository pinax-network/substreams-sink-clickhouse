import { logger } from "../logger.js";
import { Result } from "../types.js";
import client from "./createClient.js";

export async function createDatabase(database: string): Promise<Result> {
  if (!database) {
    return { success: false, error: new Error("[database] is required") };
  }

  await client.exec({ query: `CREATE DATABASE IF NOT EXISTS "${database}"` });
  logger.info(`CREATE DATABASE [${database}]`);

  return { success: true };
}
