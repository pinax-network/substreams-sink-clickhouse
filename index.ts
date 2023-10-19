import { description, name, version } from "./package.json" assert { type: "json" };

import { Option, program } from "commander";
import { initializeClickhouse } from "./src/clickhouse.js";
import config from "./src/config.js";
import { logger } from "./src/logger.js";
import { ping } from "./src/ping.js";
import { serve } from "./src/serve.js";
import { initializeManifest, initializeTables, readSchema } from "./src/table-initialization.js";

const opts = program
  .name(name)
  .version(version)
  .description(description)
  .showHelpAfterError()
  .addOption(
    new Option("-p, --port <port>", "HTTP port on which to attach the sink").default(config.PORT)
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
    new Option("--key [public-key]", "Public key to validate messages").default(config.PUBLIC_KEY)
  )
  .addOption(
    new Option("--auth [auth-key]", "Auth key to validate requests").default(config.AUTH_KEY)
  )
  .addOption(new Option("--host [hostname]", "Database HTTP hostname").default(config.DB_HOST))
  .addOption(
    new Option("--name [db-name]", "The database to use inside ClickHouse").default(config.DB_NAME)
  )
  .addOption(new Option("--user [db-user]", "Database user").default(config.DB_USERNAME))
  .addOption(
    new Option(
      "--password [db-password]",
      "Password associated with the specified username"
    ).default(config.DB_PASSWORD)
  )
  .addOption(
    new Option(
      "--create-db",
      "If the specified database does not exist, automatically create it"
    ).default(config.CREATE_DB)
  )
  .addOption(
    new Option(
      "--async-insert <async-insert>",
      "https://clickhouse.com/docs/en/operations/settings/settings#async-insert"
    )
      .choices(["0", "1"])
      .default(config.ASYNC_INSERTS)
  )
  .addOption(
    new Option(
      "--wait-insert <wait-insert>",
      "https://clickhouse.com/docs/en/operations/settings/settings#wait-for-async-insert"
    )
      .choices(["0", "1"])
      .default(config.WAIT_FOR_ASYNC_INSERTS)
  )
  .addOption(
    new Option(
      "--p-queue-limit <p-queue-limit>",
      "Insert delay to each response when the pqueue exceeds this value"
    ).default(config.P_QUEUE_LIMIT)
  )
  .parse()
  .opts();

if (opts.verbose) {
  logger.enable(opts.verbose);
}

await initializeClickhouse({
  host: opts.host,
  username: opts.username,
  password: opts.password,
  database: opts.name,
  createDatabase: opts.createDb,
  asyncInsert: +opts.asyncInsert,
  waitForInsert: +opts.waitInsert,
});

await ping();
await initializeManifest();

if (opts.schemaUrl) {
  const schema = await readSchema(opts.schemaUrl);
  await initializeTables(schema);
}

const pQueueLimit = parseInt(opts.pQueueLimit || config.P_QUEUE_LIMIT);
serve(opts.port, opts.auth, opts.key, pQueueLimit);
