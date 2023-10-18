import { PingResult, createClient } from "@clickhouse/client-web";
import config from "./config.js";

const client = createClient({
  host: config.DB_HOST,
  username: config.DB_USERNAME,
  password: config.DB_PASSWORD,
  database: config.DB_NAME,
  application: "substreams-sink-clickhouse",
  clickhouse_settings: {
    async_insert: 1,
    wait_for_async_insert: 1,
  },
});

// These overrides should not be required but the @clickhouse/client-web instance
// does not work well with Bun's implementation Node streams.
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

export { client };
