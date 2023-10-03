import { client } from "./clickhouse.js";

export async function executeInitialSchema(schemaPath: string) {
  const file = Bun.file(schemaPath || "./schema.sql");
  if (!(await file.exists())) {
    console.error(`could not find the requested file: '${schemaPath}'`);
    process.exit(1);
  }

  console.log("Executing schema.");
  const schema = await file.text();
  await client.exec({ query: schema });
  console.log("Complete.");
}
