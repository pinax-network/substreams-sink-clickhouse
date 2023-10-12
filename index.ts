import { description, name, version } from "./package.json" assert { type: "json" };

import { Command } from "commander";
import config from "./src/config.js";
import { logger } from "./src/logger.js";
import { ping } from "./src/ping.js";
import { serve } from "./src/serve.js";
import { initializeManifest } from "./src/table-initialization.js";

const program = new Command();
program.name(name).description(description).version(version);
program.option("-v, --verbose", "enable logs. format options: [pretty, json]");
program.option("-p, --port <port>");
program.parse();

const options = program.opts();
if (options?.verbose) {
  logger.enable(options.verbose === "json" ? "json" : "pretty");
} else {
  logger.disable();
}

logger.enable();
await ping();
await initializeManifest();
serve(options.port || config.PORT || 3000);
