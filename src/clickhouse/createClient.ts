import * as clickhouse from "@clickhouse/client-web";
import { APP_NAME, config } from "../config.js";

function createClient(readonly = false) {
    return clickhouse.createClient({
        host: config.host,
        password: config.password,
        database: config.database,
        clickhouse_settings: {
            // wait_for_async_insert: 0, // 0
            async_insert: 0, // 1
            readonly: readonly ? "1" : "0",
        },
        application: APP_NAME,
    })
}

export const client = createClient(false);
export const readOnlyClient = createClient(true);