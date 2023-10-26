import { createClient as createClientWeb } from "@clickhouse/client-web";
import { APP_NAME, config } from "../config.js";
import { ping } from "./ping.js";

function createClient(readonly = false) {
  const client = createClientWeb({
    ...config,
    clickhouse_settings: {
      wait_for_async_insert: config.waitForAsyncInsert, // 0
      async_insert: config.asyncInsert, // 1
      allow_experimental_object_type: 1,
      readonly: readonly ? "1" : "0",
    },
    application: APP_NAME,
  });

  // These overrides should not be required but the @clickhouse/client-web instance
  // does not work well with Bun's implementation of Node streams.
  // https://github.com/oven-sh/bun/issues/5470
  client.command = client.exec;
  client.ping = ping;

  return client;
}

const client = createClient();
const readOnlyClient = createClient(true);

export default client;
export { readOnlyClient };
