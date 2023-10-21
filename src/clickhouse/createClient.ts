import { createClient as createClientWeb } from "@clickhouse/client-web";
import { APP_NAME, config } from "../config.js";
import { ping } from "./ping.js";

export function createClient() {
  const client = createClientWeb({
    ...config,
    clickhouse_settings: {
      wait_for_async_insert: config.waitForAsyncInsert,
      async_insert: config.asyncInsert,
      allow_experimental_object_type: 1,
    },
    application: APP_NAME,
  });

  // These overrides should not be required but the @clickhouse/client-web instance
  // does not work well with Bun's implementation of Node streams.
  client.command = client.exec;
  client.ping = ping;
  return client;
}
