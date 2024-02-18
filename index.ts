#!/usr/bin/env node

import { config } from "./src/config.js";
import { name, version } from "./package.json" assert { type: "json" };
import DELETE from "./src/fetch/DELETE.js";
import GET from "./src/fetch/GET.js";
import OPTIONS from "./src/fetch/OPTIONS.js";
import POST from "./src/fetch/POST.js";
import PUT from "./src/fetch/PUT.js";
import { NotFound } from "./src/fetch/cors.js";
import { logger } from "./src/logger.js";
import init from "./src/fetch/init.js";

if (config.verbose) logger.enable();

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

logger.info('[app]', `${name} v${version}`);
logger.info('[app]', `Server listening on http://${app.hostname}:${app.port}`);
logger.info('[app]', `Clickhouse Server ${config.host} (${config.database})`);
if (config.publicKey) logger.info('[app]', `Webhook Ed25519 Public Key: ${config.publicKey}`);
init();