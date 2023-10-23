#!/usr/bin/env node

import { config } from "./src/config.js";
import GET from "./src/fetch/GET.js";
import POST from "./src/fetch/POST.js";
import PUT from "./src/fetch/PUT.js";
import { logger } from "./src/logger.js";

if (config.verbose) logger.enable();

const app = Bun.serve({
  hostname: config.hostname,
  port: config.port,
  fetch: function fetch(req: Request) {
    if (req.method == "GET") return GET(req);
    if (req.method == "POST") return POST(req);
    if (req.method == "PUT") return PUT(req);
    return new Response("Invalid request", { status: 400 });
  },
});

logger.info(`Server listening on http://${app.hostname}:${app.port}`);
