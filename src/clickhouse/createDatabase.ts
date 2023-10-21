import { client } from "../config.js";
import { logger } from "../logger.js";

export async function createDatabase(database: string) {
    logger.info(`Creating database '${database}'`);
    if (!database) throw new Error("The database name must be specified");
    await client.exec({query: `CREATE DATABASE IF NOT EXISTS "${database}"`});
    logger.info(`Database [${database}] created`);
}