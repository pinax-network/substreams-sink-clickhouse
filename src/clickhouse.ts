import { PingResult, createClient } from "@clickhouse/client-web";
import { WebClickHouseClient } from "@clickhouse/client-web/dist/client.js";
import { logger } from "./logger.js";

const APP_NAME = "substreams-sink-clickhouse";
let client: WebClickHouseClient;

export async function initializeClickhouse(options: {
  database: string;
  username: string;
  password: string;
  host: string;
  asyncInsert: number;
  waitForInsert: number;
  createDatabase: boolean;
}) {
  logger.info(`Initializing ClickHouse client with database: '${options.database}'`);
  if (options.createDatabase) {
    await initializeDatabase(options.database);
  }

  client = createClient({
    ...options,
    clickhouse_settings: {
      wait_for_async_insert: options.waitForInsert ? 1 : 0,
      async_insert: options.asyncInsert ? 1 : 0,
      allow_experimental_object_type: 1,
    },
    application: APP_NAME,
  });

  // These overrides should not be required but the @clickhouse/client-web instance
  // does not work well with Bun's implementation of Node streams.
  client.command = client.exec;
  client.ping = async function ping(): Promise<PingResult> {
    try {
      await client.exec({ query: "SELECT 1" });
      return { success: true };
    } catch (err) {
      const message = typeof err === "string" ? err : JSON.stringify(err);
      return { success: false, error: new Error(message) };
    }
  };
}

async function initializeDatabase(database: string) {
  logger.info(`Creating database '${database}'`);

  if (!database) {
    throw new Error("The database name must be specified");
  }

  await createClient({ application: APP_NAME }).exec({
    query: `CREATE DATABASE IF NOT EXISTS "${database}"`,
  });
  logger.info("Database created");
}

export { client };
