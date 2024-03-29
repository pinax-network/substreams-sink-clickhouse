#!/usr/bin/env node

import { config, publicKeys } from "./src/config.js";
import { name, version } from "./package.json" assert { type: "json" };
import DELETE from "./src/fetch/DELETE.js";
import GET from "./src/fetch/GET.js";
import OPTIONS from "./src/fetch/OPTIONS.js";
import POST from "./src/fetch/POST.js";
import PUT from "./src/fetch/PUT.js";
import { NotFound } from "./src/fetch/cors.js";
import { logger } from "./src/logger.js";
import init from "./src/fetch/init.js";
import { show_databases, show_tables } from "./src/clickhouse/stores.js";
import "./src/exitHandler.js"
import * as buffer from "./src/buffer.js"

if (config.verbose) logger.enable();

// initizalize before starting the server
await init();
await show_tables();
await show_databases();
await buffer.flush(true);

const app = Bun.serve({
  hostname: config.hostname,
  port: config.port,
  fetch(req: Request) {
    if (req.method === "GET") return GET(req);
    if (req.method === "POST") return POST(req);
    if (req.method === "PUT") return PUT(req);
    if (req.method === "OPTIONS") return OPTIONS(req);
    if (req.method === "DELETE") return DELETE(req);
    return NotFound;
  },
});

// logging
logger.info('[app]\t', `${name} v${version}`);
logger.info('[app]\t', `Sink Server listening on http://${app.hostname}:${app.port}`);
logger.info('[app]\t', `Clickhouse DB ${config.host} (${config.database})`);
for ( const publicKey of publicKeys ) {
  logger.info('[app]\t', `Webhook Ed25519 public key (${publicKey})`);
}