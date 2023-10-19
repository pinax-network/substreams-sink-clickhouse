import { PingResult, createClient } from "@clickhouse/client-web";
import { WebClickHouseClient } from "@clickhouse/client-web/dist/client.js";
import { logger } from "./logger.js";

const APP_NAME = "substreams-sink-clickhouse";
let client: WebClickHouseClient;

export async function initializeClickhouse(
  options:
    | Record<"host" | "username" | "password" | "database", string> & { createDatabase: boolean }
) {
  logger.info(`Initializing ClickHouse client with database: '${options.database}'`);
  if (options.createDatabase) {
    logger.info(`Creating database '${options.database}'`);

    if (!options.database) {
      throw new Error("The database name must be specified");
    }

    await createClient({ application: APP_NAME }).exec({
      query: `CREATE DATABASE IF NOT EXISTS "${options.database}"`,
    });
    logger.info("Database created");
  }

  client = createClient({
    ...options,
    application: APP_NAME,
    clickhouse_settings: {
      async_insert: 1,
      wait_for_async_insert: 0,
    },
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

export { client };
