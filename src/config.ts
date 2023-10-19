import "dotenv/config";
import z from "zod";

const EnvSchema = z.object({
  PUBLIC_KEY: z.optional(z.string()),
  AUTH_KEY: z.string().optional(),

  PORT: z
    .string()
    .transform((str) => parseInt(str))
    .default("3000"),

  VERBOSE: z.optional(z.enum(["pretty", "json"]).or(z.literal("true").transform(() => "pretty"))),

  DB_HOST: z.string().default("http://localhost:8123"),
  DB_NAME: z.string().default("default"),
  DB_USERNAME: z.string().default("default"),
  DB_PASSWORD: z.string().default(""),
  CREATE_DB: z
    .string()
    .transform((str) => str === "true")
    .default("false"),

  SCHEMA_URL: z.string().default("./schema.sql"),
});

let config: z.infer<typeof EnvSchema>;
try {
  config = EnvSchema.parse(process.env);
} catch (err) {
  console.error("Could not load config: ");
  console.error(err);
  process.exit(1);
}

export default config!;
