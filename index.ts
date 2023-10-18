import {
  description,
  name,
  version,
} from "./package.json" assert { type: "json" };

import { Option, program } from "commander";
import { initializeClickhouse } from "./src/clickhouse.js";
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
    new Option(
      "-p, --port <port>",
      "HTTP port on which to attach the sink"
    ).default(config.PORT)
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
  .addOption(
    new Option("--key [public-key]", "Public key to validate messages").default(
      config.PUBLIC_KEY
    )
  )
  .addOption(
    new Option("--auth [auth-key]", "Auth key to validate requests").default(
      config.AUTH_KEY
    )
  )
  .addOption(
    new Option("--host [hostname]", "Database HTTP hostname").default(
      config.DB_HOST
    )
  )
  .addOption(
    new Option(
      "--name [db-name]",
      "The database to use inside ClickHouse"
    ).default(config.DB_NAME)
  )
  .addOption(
    new Option("--user [db-user]", "Database user").default(config.DB_USERNAME)
  )
  .addOption(
    new Option(
      "--password [db-password]",
      "Password associated with the specified username"
    ).default(config.DB_PASSWORD)
  )
  .parse()
  .opts();

if (opts.verbose) {
  logger.enable(opts.verbose);
}

initializeClickhouse({
  host: opts.host,
  uesrname: opts.username,
  password: opts.password,
  database: opts.name,
});

await ping();
await initializeManifest();

if (opts.schemaUrl) {
  const schema = await readSchema(opts.schemaUrl);
  await initializeTables(schema);
}

serve(opts.port, opts.auth, opts.key);
