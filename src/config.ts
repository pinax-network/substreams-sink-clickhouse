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
export const APP_NAME = name;

export const opts = program
  .name(name)
  .version(version)
  .description(description)
  .showHelpAfterError()
  .addOption(new Option("-p, --port <number>", "HTTP port on which to attach the sink").env("PORT").default(DEFAULT_PORT))
  .addOption(new Option("-v, --verbose <boolean>", "Enable verbose logging").choices(["true", "false"]).env("VERBOSE").default(DEFAULT_VERBOSE))
  .addOption(new Option("--hostname <string>", "Server listen on HTTP hostname").env("HOSTNAME").default(DEFAULT_HOSTNAME))
  .addOption(new Option("--public-key <string>", "Comma separated list of public keys to validate messages").env("PUBLIC_KEY"))
  .addOption(new Option("--host <string>", "Database HTTP hostname").env("HOST").default(DEFAULT_HOST))
  .addOption(new Option("--username <string>", "Database user").env("USERNAME").default(DEFAULT_USERNAME))
  .addOption(new Option("--password <string>", "Password associated with the specified username").env("PASSWORD").default(DEFAULT_PASSWORD))
  .addOption(new Option("--database <string>", "The database to use inside ClickHouse").env("DATABASE").default(DEFAULT_DATABASE))
  .parse()
  .opts();

// Validate Commander argument & .env options
export const config = ConfigSchema.parse(opts);
