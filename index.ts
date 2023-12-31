#!/usr/bin/env node

import { config } from "./src/config.js";
import DELETE from "./src/fetch/DELETE.js";
import GET from "./src/fetch/GET.js";
import OPTIONS from "./src/fetch/OPTIONS.js";
import POST from "./src/fetch/POST.js";
import PUT from "./src/fetch/PUT.js";
import { NotFound } from "./src/fetch/cors.js";
import { logger } from "./src/logger.js";
import { resume } from "./src/resume.js";

if (config.verbose) logger.enable();
if (config.resume) resume();

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

logger.info(`Server listening on http://${app.hostname}:${app.port}`);
if (config.authKey) logger.info(`Auth Key: ${config.authKey}`);
