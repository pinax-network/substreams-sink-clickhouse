import { ClickHouseClient, createClient } from "@clickhouse/client-web";
import config from "./config.js";

type BunClickHouseClient = Omit<ClickHouseClient, "ping" | "query" | "command">;

const clientConfig = {
  host: config.DB_HOST,
  username: config.DB_USERNAME,
  password: config.DB_PASSWORD,
  database: config.DB_NAME,
  application: "substreams-sink-clickhouse",
};

export const client: BunClickHouseClient = createClient(clientConfig);
