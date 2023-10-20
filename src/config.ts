import { Option, program } from "commander";
import "dotenv/config";
import z from "zod";
import { description, name, version } from "../package.json" assert { type: "json" };

// Defaults
export const DEFAULT_PORT = "3000";
export const DEFAULT_VERBOSE = "pretty";
export const DEFAULT_HOST = "http://localhost:8123";
export const DEFAULT_DATABASE = "default";
export const DEFAULT_USERNAME = "default";
export const DEFAULT_PASSWORD = "";
export const DEFAULT_CREATE_DATABASE = "false";
export const DEFAULT_ASYNC_INSERT = 1;
export const DEFAULT_WAIT_FOR_INSERT = 0;
export const DEFAULT_QUEUE_LIMIT = 10;
export const DEFAULT_QUEUE_CONCURRENCY = 10;
export const DEFAULT_SCHEMA_URL = "./schema.sql";

const ConfigSchema = z.object({
  publicKey: z.optional(z.string()),
  authKey: z.string().optional(),
  port: z
    .string()
    .transform((str) => parseInt(str))
    .pipe(z.number().positive()),
  verbose: z.string().transform((str) => str.toLowerCase() === "true"),
  host: z.string(),
  database: z.string(),
  username: z.string(),
  password: z.string(),
  createDatabase: z
    .string()
    .transform((str) => str.toLowerCase() === "true")
    .or(z.boolean()),
  asyncInsert: z.coerce.number().pipe(z.literal(0).or(z.literal(1))),
  waitForInsert: z.coerce.number().pipe(z.literal(0).or(z.literal(1))),
  queueLimit: z.coerce.number().positive(),
  queueConcurrency: z.coerce.number().positive(),
  schemaUrl: z.string().default("./schema.sql"),
});

let config: z.infer<typeof ConfigSchema>;

export function parseConfig(showHelp = true, argv?: readonly string[]) {
  const command = program
    .name(name)
    .version(version)
    .description(description)
    .showHelpAfterError(showHelp)
    .addOption(new Option("-p, --port <number>", "HTTP port on which to attach the sink").env("PORT").default(DEFAULT_PORT))
    .addOption(new Option("-v, --verbose <boolean>", "Enable verbose logging").choices(["true", "false"]).env("VERBOSE").default(DEFAULT_VERBOSE))
    .addOption(new Option("-s, --schema-url <string>", "Execute SQL instructions before starting the sink").env("SCHEMA_URL").preset(DEFAULT_SCHEMA_URL))
    .addOption(new Option("--public-key <string>", "Public key to validate messages").env("PUBLIC_KEY"))
    .addOption(new Option("--auth-key <string>", "Auth key to validate requests").env("AUTH_KEY"))
    .addOption(new Option("--host <string>", "Database HTTP hostname").env("HOST").default(DEFAULT_HOST))
    .addOption(new Option("--database <string>", "The database to use inside ClickHouse").env("DATABASE").default(DEFAULT_DATABASE))
    .addOption(new Option("--username <string>", "Database user").env("USERNAME").default(DEFAULT_USERNAME))
    .addOption(new Option("--password <string>", "Password associated with the specified username").env("PASSWORD").default(DEFAULT_PASSWORD))
    .addOption(new Option("--create-database [boolean]", "If the specified database does not exist, automatically create it").choices(["true", "false"]).env("CREATE_DATABASE").default(DEFAULT_CREATE_DATABASE))
    .addOption(new Option("--async-insert <number>", "https://clickhouse.com/docs/en/operations/settings/settings#async-insert").choices(["0", "1"]).env("ASYNC_INSERT").default(DEFAULT_ASYNC_INSERT))
    .addOption(new Option("--wait-for-insert <number>", "https://clickhouse.com/docs/en/operations/settings/settings#wait-for-async-insert").choices(["0", "1"]).env("WAIT_FOR_INSERT").default(DEFAULT_WAIT_FOR_INSERT))
    .addOption(new Option("--queue-limit <number>", "Insert delay to each response when the pqueue exceeds this value").env("QUEUE_LIMIT").default(DEFAULT_QUEUE_LIMIT))
    .addOption(new Option("--queue-concurrency <number>", "https://github.com/sindresorhus/p-queue#concurrency").env("QUEUE_CONCURRENCY").default(DEFAULT_QUEUE_CONCURRENCY))
    .parse(argv);

  if (!showHelp) {
    command.exitOverride(() => {
      throw new Error("Invalid arguments");
    });
  }

  console.log(command.opts());

  config = ConfigSchema.parse(command.opts());
}

export { config };
