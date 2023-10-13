import { description, name, version } from "./package.json" assert { type: "json" };

import { Command, OptionValues } from "commander";
import config from "./src/config.js";
import { logger } from "./src/logger.js";
import { ping } from "./src/ping.js";
import { serve } from "./src/serve.js";
import { handleTableInitialization, initializeManifest } from "./src/table-initialization.js";

const program = new Command();
program.name(name).description(description).version(version);
program.option("-v, --verbose", "enable logs. format options: [pretty, json]");
program.option("-p, --port <port>");
program.option("-s, --schemaUrl [schema]", "execute sql instructions before starting the sink");
program.parse();

const options = program.opts();
if (options?.verbose) {
  logger.enable(options.verbose === "json" ? "json" : "pretty");
} else {
  logger.disable();
}

await ping();
await initializeManifest();

const schemaUrl = getSchemaUrl(options);
if (schemaUrl) {
  await initializeSchema(schemaUrl);
}

serve(options.port || config.PORT || 3000);

function getSchemaUrl(options: OptionValues) {
  const inputSchemaUrl =
    typeof options.schemaUrl === "string" ? options.schemaUrl : config.SCHEMA_URL;
  if (!inputSchemaUrl) {
    return null;
  }

  try {
    return new URL(inputSchemaUrl);
  } catch {
    logger.error("could not resolve the url. Is it valid?");
    process.exit(1);
  }
}

async function initializeSchema(schemaUrl: URL) {
  try {
    const schema = await fetch(schemaUrl);
    const schemaStr = await schema.text();
    await handleTableInitialization({ schema: schemaStr });
  } catch (err) {
    logger.error("could not execute the specified schema: ");
    process.exit(1);
  }
}
