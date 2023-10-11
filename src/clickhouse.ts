import { ExecParams, PingResult, createClient } from "@clickhouse/client-web";
import config from "./config.js";

type Client = ReturnType<typeof createClient>;
type InputParams = Parameters<Client["insert"]>[0];

export class BunClickHouseClient {
  private client: Client;

  constructor() {
    this.client = createClient({
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
  }

  public async ping(): Promise<PingResult> {
    try {
      await this.client.exec({ query: "SELECT 1" });
      return { success: true };
    } catch (err) {
      const message = typeof err === "string" ? err : JSON.stringify(err);
      return { success: false, error: new Error(message) };
    }
  }

  public async command(params: ExecParams) {
    return this.client.exec(params);
  }

  public async insert(params: InputParams) {
    return this.client.insert(params);
  }
}

export const client = new BunClickHouseClient();
