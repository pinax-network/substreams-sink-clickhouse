import { Command } from "commander";
import {
  description,
  name,
  version,
} from "./package.json" assert { type: "json" };
import config from "./src/config.js";
import { logger } from "./src/logger.js";
import { executeInitialSchema } from "./src/schema.js";
import { serveSink } from "./src/server.js";

logger.enable();

const program = new Command();
program.name(name).description(description).version(version);

program
  .command("run")
  .description(
    "serves the sink on http to receive substreams data from substreams-sink-webhook"
  )
  .option("-s, --schema [schema]")
  .action(async (options) => {
    if ("schema" in options) {
      const schemaPath =
        typeof options.schema === "string" ? options.schema : config.SCHEMA;
      await executeInitialSchema(schemaPath);
    }

    serveSink();
  });

program
  .command("schema")
  .description("execute a provided SQL schema to initialize the database")
  .argument("[schema]", "the SQL schema file to execute", config.SCHEMA)
  .action(executeInitialSchema);

program.parse();
