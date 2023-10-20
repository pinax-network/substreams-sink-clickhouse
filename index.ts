#!/usr/bin/env node

import { Server } from "bun";
import { APP_NAME, client, config } from "./src/config.js";
import { logger } from "./src/logger.js";
import GET from "./src/fetch/GET.js";
import POST from "./src/fetch/POST.js";
import PUT from "./src/fetch/PUT.js";
import { initializeManifest, initializeTables, readSchema } from "./src/clickhouse/table-initialization.js";
import { createDatabase } from "./src/clickhouse/createDatabase.js";

if (config.verbose) logger.enable();

// TO-DO: add `--init` flag to force initialization
if ( true ) {
  logger.info(await client.ping());
  await initializeManifest();

  if (config.schemaUrl) {
    const schema = await readSchema(config.schemaUrl);
    await initializeTables(schema);
  }

  if (config.createDatabase) {
    await createDatabase(config.database);
  }
}

const app = Bun.serve({
  hostname: config.hostname,
  port: config.port,
  fetch(req: Request, server: Server) {
    if ( req.method == "GET" ) return GET(req, server);
    if ( req.method == "POST") return POST(req, server);
    if ( req.method == "PUT") return PUT(req, server);
    return new Response("Invalid request", { status: 400 });
  },
});

logger.info(`${APP_NAME} listening on http://${app.hostname}:${app.port}`);
