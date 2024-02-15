import { logger } from "../logger.js";
import { Err, Ok, Result } from "../result.js";
import client from "./createClient.js";

export async function createDatabase(database: string): Promise<Result> {
  if (!database) {
    return Err(new Error("[database] is required"));
  }

  await client.exec({ query: `CREATE DATABASE IF NOT EXISTS "${database}"` });
  logger.info('[createDatabase]', `CREATE DATABASE [${database}]`);

  return Ok();
}
