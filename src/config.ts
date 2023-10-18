import "dotenv/config";
import z from "zod";

const EnvSchema = z.object({
  PUBLIC_KEY: z.string(),
  PORT: z
    .string()
    .transform((str) => parseInt(str))
    .default("3000"),

  VERBOSE: z.optional(
    z.enum(["pretty", "json"]).or(z.literal("true").transform(() => "pretty"))
  ),

  DB_HOST: z.string(),
  DB_NAME: z.string(),
  DB_USERNAME: z.string(),
  DB_PASSWORD: z.string(),

  SCHEMA_URL: z.string().default("./schema.sql"),

  AUTH_KEY: z.string().optional(),
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
