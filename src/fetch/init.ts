import { createDatabase } from "../clickhouse/createDatabase.js";
import { ping } from "../clickhouse/ping.js";
import { initializeDefaultTables } from "../clickhouse/table-initialization.js";
import { config } from "../config.js";
import { logger } from "../logger.js";
import { sqlite } from "../sqlite/sqlite.js";
import { BadRequest, toText } from "./cors.js";

export default async function () {
  try {
    await ping();
    await createDatabase(config.database);
    await initializeDefaultTables();
    await sqlite.init();
    return toText("OK");
  } catch (e) {
    logger.error(e);
    return BadRequest;
  }
}
