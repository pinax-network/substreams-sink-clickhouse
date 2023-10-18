import {
  description,
  name,
  version,
} from "./package.json" assert { type: "json" };

import { Option, program } from "commander";
import config from "./src/config.js";
import { logger } from "./src/logger.js";
import { ping } from "./src/ping.js";
import { serve } from "./src/serve.js";
import {
  initializeManifest,
  initializeTables,
  readSchema,
} from "./src/table-initialization.js";

const opts = program
  .name(name)
  .version(version)
  .description(description)
  .showHelpAfterError()
  .addOption(
    new Option("-p, --port <port>", "Listen on HTTP port").default(config.PORT)
  )
  .addOption(
    new Option("-v, --verbose [format]", "Enable logs")
      .choices(["pretty", "json"])
      .preset("pretty")
      .default(config.VERBOSE)
  )
  .addOption(
    new Option(
      "-s, --schema-url [schema-url]",
      "Execute SQL instructions before starting the sink"
    ).preset(config.SCHEMA_URL)
  )
  .parse()
  .opts();

if (opts.verbose) {
  logger.enable(opts.verbose);
}

await ping();
await initializeManifest();

if (opts.schemaUrl) {
  const schema = await readSchema(opts.schemaUrl);
  await initializeTables(schema);
}

serve(opts.port);
