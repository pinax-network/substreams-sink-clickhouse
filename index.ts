import { description, name, version } from "./package.json" assert { type: "json" };

import { Command, OptionValues } from "commander";
import config from "./src/config.js";
import { logger } from "./src/logger.js";
import { ping } from "./src/ping.js";
import { serve } from "./src/serve.js";
import { initializeManifest, initializeTables } from "./src/table-initialization.js";

const program = new Command();
program.name(name).description(description).version(version);
program.option("-v, --verbose", "enable logs. format options: [pretty, json]");
program.option("-p, --port <port>");
program.option("-s, --schema-url [schema]", "execute sql instructions before starting the sink");
program.parse();

const options = program.opts();
if (options?.verbose) {
  logger.enable(options.verbose === "json" ? "json" : "pretty");
} else {
  logger.disable();
}

await ping();
await initializeManifest();

const schema = await getSchema(options);
if (schema) {
  try {
    await initializeTables(schema);
  } catch {
    process.exit(1);
  }
}

serve(options.port || config.PORT || 3000);

async function getSchema(options: OptionValues) {
  if (!options.schemaUrl) {
    return null;
  }

  const inputSchemaUrl =
    typeof options.schemaUrl === "string" ? options.schemaUrl : config.SCHEMA_URL;
  if (!inputSchemaUrl) {
    logger.error("could not find the schema url.");
    process.exit(1);
  }

  try {
    const file = Bun.file(inputSchemaUrl);
    if (await file.exists()) {
      return file.text();
    }

    const url = new URL(inputSchemaUrl);
    const response = await fetch(url);
    return response.text();
  } catch {
    logger.error("could not find the requested schema. Is it valid?");
    process.exit(1);
  }
}
