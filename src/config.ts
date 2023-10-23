import "dotenv/config";

import { Option, program } from "commander";
import { description, name, version } from "../package.json" assert { type: "json" };
import { createClient } from "./clickhouse/createClient.js";
import { ConfigSchema } from "./schemas.js";

// Defaults
export const DEFAULT_PORT = "3000";
export const DEFAULT_VERBOSE = "true";
export const DEFAULT_HOSTNAME = "0.0.0.0"
export const DEFAULT_HOST = "http://localhost:8123";
export const DEFAULT_DATABASE = "default";
export const DEFAULT_USERNAME = "default";
export const DEFAULT_PASSWORD = "";
export const DEFAULT_CREATE_DATABASE = "false";
export const DEFAULT_ASYNC_INSERT = 1;
export const DEFAULT_WAIT_FOR_ASYNC_INSERT = 0;
export const DEFAULT_QUEUE_LIMIT = 10;
export const DEFAULT_QUEUE_CONCURRENCY = 10;
export const DEFAULT_SCHEMA_URL = "./schema.sql";
export const APP_NAME = name;

export const opts = program
  .name(name)
  .version(version)
  .description(description)
  .showHelpAfterError()
  .addOption(new Option("-p, --port <number>", "HTTP port on which to attach the sink").env("PORT").default(DEFAULT_PORT))
  .addOption(new Option("-v, --verbose <boolean>", "Enable verbose logging").choices(["true", "false"]).env("VERBOSE").default(DEFAULT_VERBOSE))
  .addOption(new Option("--hostname <string>", "Server listen on HTTP hostname").env("HOSTNAME").default(DEFAULT_HOSTNAME))
  .addOption(new Option("-s, --schema-url <string>", "Execute SQL instructions before starting the sink").env("SCHEMA_URL").preset(DEFAULT_SCHEMA_URL))
  .addOption(new Option("--public-key <string>", "Public key to validate messages").env("PUBLIC_KEY"))
  .addOption(new Option("--auth-key <string>", "Auth key to validate requests").env("AUTH_KEY"))
  .addOption(new Option("--host <string>", "Database HTTP hostname").env("HOST").default(DEFAULT_HOST))
  .addOption(new Option("--username <string>", "Database user").env("USERNAME").default(DEFAULT_USERNAME))
  .addOption(new Option("--password <string>", "Password associated with the specified username").env("PASSWORD").default(DEFAULT_PASSWORD))
  .addOption(new Option("--database <string>", "The database to use inside ClickHouse").env("DATABASE").default(DEFAULT_DATABASE))
  .addOption(new Option("--create-database <boolean>", "If the specified database does not exist, automatically create it").env("CREATE_DATABASE").default(DEFAULT_CREATE_DATABASE))
  .addOption(new Option("--async-insert <number>", "https://clickhouse.com/docs/en/operations/settings/settings#async-insert").choices(["0", "1"]).env("ASYNC_INSERT").default(DEFAULT_ASYNC_INSERT))
  .addOption(new Option("--wait-for-async-insert <boolean>", "https://clickhouse.com/docs/en/operations/settings/settings#wait-for-async-insert").choices(["0", "1"]).env("WAIT_FOR_INSERT").default(DEFAULT_WAIT_FOR_ASYNC_INSERT))
  .addOption(new Option("--queue-limit <number>","Insert delay to each response when the pqueue exceeds this value").env("QUEUE_LIMIT").default(DEFAULT_QUEUE_LIMIT))
  .addOption(new Option("--queue-concurrency <number>","https://github.com/sindresorhus/p-queue#concurrency").env("QUEUE_CONCURRENCY").default(DEFAULT_QUEUE_CONCURRENCY))
  .parse()
  .opts();


// Validate Commander argument & .env options
export const config = ConfigSchema.parse(opts);

// WebClickHouseClient
export const client = createClient();