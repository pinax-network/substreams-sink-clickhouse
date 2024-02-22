import * as clickhouse from "@clickhouse/client-web";
import { APP_NAME, config } from "../config.js";

function createClient(readonly = false, database = "default") {
    return clickhouse.createClient({
        host: config.host,
        password: config.password,
        database,
        clickhouse_settings: {
            // wait_for_async_insert: 0, // 0
            async_insert: 0, // 1
            readonly: readonly ? "1" : "0",
        },
        application: APP_NAME,
    })
}

export const client = createClient(false, config.database);
export const defaultClient = createClient(false, "default");
export const readOnlyClient = createClient(true, config.database);
