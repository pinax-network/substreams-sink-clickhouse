import { createClient as createClientWeb } from "@clickhouse/client-web";
import { APP_NAME, config } from "../config.js";

export function createClient() {
  const client = createClientWeb({
    ...config,
    clickhouse_settings: {
      // TO-DO: remove fallback configs, should be defined in config
      wait_for_async_insert: config.waitForInsert ? 1 : 0,
      async_insert: config.asyncInsert ? 1 : 0,
      allow_experimental_object_type: 1,
    },
    // TO-DO: define `--application` as config
    application: APP_NAME,
  });

  // These overrides should not be required but the @clickhouse/client-web instance
  // does not work well with Bun's implementation of Node streams.
  client.command = client.exec;
  return client;
}
