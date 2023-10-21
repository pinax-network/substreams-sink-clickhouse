import { initializeManifest } from "../clickhouse/table-initialization.js";
import { createDatabase } from "../clickhouse/createDatabase.js";
import { ping } from "../clickhouse/ping.js";
import { config } from "../config.js";

export default async function (req: Request) {
  try {
    await ping();
    await createDatabase(config.database);
    await initializeManifest();
    return new Response("OK");
  } catch (e: any) {
    return new Response(e.message, { status: 400 });
  }
}
