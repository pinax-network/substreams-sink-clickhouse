import { client } from "./clickhouse.js";
import { logger } from "./logger.js";

export async function ping() {
  try {
    await client.exec({ query: "SELECT 1" });
    logger.info("OK");
  } catch (err) {
    if (typeof err === "string") {
      logger.error(err);
    } else {
      logger.error(JSON.stringify(err));
    }
  }
}
