import { createDatabase } from "../clickhouse/createDatabase.js";
import { ping } from "../clickhouse/ping.js";
import { initializeDefaultTables } from "../clickhouse/table-initialization.js";
import { config } from "../config.js";

export default async function () {
  try {
    await ping();
    await createDatabase(config.database);
    await initializeDefaultTables();
    return new Response("OK");
  } catch (e) {
    return new Response(e instanceof Error ? e.message : JSON.stringify(e), { status: 400 });
  }
}
