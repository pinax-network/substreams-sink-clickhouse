import { Command, Option } from "commander";
import {
  description,
  name,
  version,
} from "./package.json" assert { type: "json" };
import { ping } from "./src/commands/ping.js";
import { executeInitialSchema } from "./src/commands/schema.js";
import { serveSink } from "./src/commands/serve.js";
import config from "./src/config.js";
import { logger } from "./src/logger.js";

const program = new Command();
program.name(name).description(description).version(version);

const verboseOption = new Option(
  "-v, --verbose [format]",
  "enable logs. format options: [json, pretty]"
);

program.hook("preAction", (_, command) => {
  const options = command.opts();
  if (options?.verbose) {
    logger.enable(options.verbose === "json" ? "json" : "pretty");
  } else {
    logger.disable();
  }
});

program
  .command("run")
  .description(
    "serves the sink on http to receive substreams data from substreams-sink-webhook"
  )
  .addOption(verboseOption)
  .option("-s, --schema [schema]")
  .option("-p, --port <port>")
  .action(async (options) => {
    if ("schema" in options) {
      await executeInitialSchema(
        typeof options.schema === "string" ? options.schema : config.SCHEMA
      );
    }

    const port = parseInt(options?.port) || config.PORT || 3000;
    serveSink(port);
  });

program
  .command("schema")
  .description("execute a provided SQL schema to initialize the database")
  .argument("[schema]", "the SQL schema file to execute", config.SCHEMA)
  .action(executeInitialSchema);

program
  .command("ping")
  .description("validate the connection with the database")
  .action(ping);

program.parse();
