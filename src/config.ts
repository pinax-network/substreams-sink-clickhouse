import "dotenv/config";

import { Option, program } from "commander";
import { description, name, version } from "../package.json" assert { type: "json" };
import { ConfigSchema } from "./schemas.js";

// Defaults
export const DEFAULT_PORT = "3000";
export const DEFAULT_VERBOSE = "true";
export const DEFAULT_HOSTNAME = "0.0.0.0";
export const DEFAULT_HOST = "http://localhost:8123";
export const DEFAULT_DATABASE = "default";
export const DEFAULT_USERNAME = "default";
export const DEFAULT_PASSWORD = "";
export const DEFAULT_ASYNC_INSERT = 1;
export const DEFAULT_WAIT_FOR_ASYNC_INSERT = 0;
export const DEFAULT_MAX_BUFFER_SIZE = 10_000;
export const DEFAULT_INSERTION_DELAY = 2000;
export const DEFAULT_ALLOW_UNPARSED = false;
export const DEFAULT_TRANSACTION_SIZE = 50;
export const APP_NAME = name;

export const opts = program
  .name(name)
  .version(version)
  .description(description)
  .showHelpAfterError()
  .addOption(new Option("-p, --port <number>", "HTTP port on which to attach the sink").env("PORT").default(DEFAULT_PORT))
  .addOption(new Option("-v, --verbose <boolean>", "Enable verbose logging").choices(["true", "false"]).env("VERBOSE").default(DEFAULT_VERBOSE))
  .addOption(new Option("--hostname <string>", "Server listen on HTTP hostname").env("HOSTNAME").default(DEFAULT_HOSTNAME))
  .addOption(new Option("--public-key <string>", "Public key to validate messages").env("PUBLIC_KEY"))
  .addOption(new Option("--auth-key <string>", "Auth key to validate requests").env("AUTH_KEY"))
  .addOption(new Option("--host <string>", "Database HTTP hostname").env("HOST").default(DEFAULT_HOST))
  .addOption(new Option("--username <string>", "Database user").env("USERNAME").default(DEFAULT_USERNAME))
  .addOption(new Option("--password <string>", "Password associated with the specified username").env("PASSWORD").default(DEFAULT_PASSWORD))
  .addOption(new Option("--database <string>", "The database to use inside ClickHouse").env("DATABASE").default(DEFAULT_DATABASE))
  .addOption(new Option("--async-insert <number>", "https://clickhouse.com/docs/en/operations/settings/settings#async-insert").choices(["0", "1"]).env("ASYNC_INSERT").default(DEFAULT_ASYNC_INSERT))
  .addOption(new Option("--wait-for-async-insert <boolean>", "https://clickhouse.com/docs/en/operations/settings/settings#wait-for-async-insert").choices(["0", "1"]).env("WAIT_FOR_INSERT").default(DEFAULT_WAIT_FOR_ASYNC_INSERT))
  .addOption(new Option("--max-buffer-size <number>", "Maximum insertion batch size").env("MAX_BUFFER_SIZE").default(DEFAULT_MAX_BUFFER_SIZE))
  .addOption(new Option("--insertion-delay <number>", "Delay between batch insertions (in ms)").env("INSERTION_DELAY").default(DEFAULT_INSERTION_DELAY))
  .addOption(new Option("--allow-unparsed <boolean>", "Enable storage in 'unparsed_json' table").choices(["true", "false"]).env("ALLOW_UNPARSED").default(DEFAULT_ALLOW_UNPARSED))
  .addOption(new Option("--transaction-size <number>", "Number of insert statements in a SQLite transaction").env("TRANSACTION_SIZE").default(DEFAULT_TRANSACTION_SIZE))
  .parse()
  .opts();

// Validate Commander argument & .env options
export const config = ConfigSchema.parse(opts);
