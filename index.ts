import { initializeClickhouse } from "./src/clickhouse.js";
import { config } from "./src/config.js";
import { logger } from "./src/logger.js";
import { ping } from "./src/ping.js";
import { serve } from "./src/serve.js";
import { initializeManifest, initializeTables, readSchema } from "./src/table-initialization.js";

if (config.verbose) logger.enable();

await initializeClickhouse({...config});
await ping();
await initializeManifest();

if (config.schemaUrl) {
  const schema = await readSchema(config.schemaUrl);
  await initializeTables(schema);
}

serve(config.port, config.authKey, config.publicKey, config.queueLimit, config.queueConcurrency);
