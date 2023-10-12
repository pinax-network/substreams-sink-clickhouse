import { StaticDecode, Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import "dotenv/config";

const EnvSchema = Type.Object({
  PUBLIC_KEY: Type.String(),
  PORT: Type.Optional(
    Type.Transform(Type.String())
      .Decode((str) => parseInt(str))
      .Encode((num) => num.toString())
  ),
  DB_HOST: Type.String(),
  DB_NAME: Type.String(),
  DB_USERNAME: Type.String(),
  DB_PASSWORD: Type.String({ default: "" }),
  SCHEMA: Type.Optional(Type.String()),
});

let config: StaticDecode<typeof EnvSchema>;
try {
  config = Value.Decode(EnvSchema, process.env);
} catch {
  console.error("Could not load config: ");
  for (const err of Value.Errors(EnvSchema, process.env)) {
    console.error(err);
  }

  process.exit(1);
}

export default config!;
