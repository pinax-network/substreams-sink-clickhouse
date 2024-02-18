import { createDatabase } from "../clickhouse/createDatabase.js";
import { ping } from "../clickhouse/ping.js";
import { initializeDefaultTables } from "../clickhouse/table-initialization.js";
import { config } from "../config.js";
import { toJSON } from "./cors.js";

export default async function init() {
  return toJSON({
    ping: await ping(),
    createDatabase: await createDatabase(config.database),
    initializeDefaultTables: await initializeDefaultTables(),
  });
}
