import { client } from "../clickhouse.js";
import { logger } from "../logger.js";

export async function ping() {
  const result = await client.ping();
  if (result.success) {
    logger.info("OK");
  } else {
    logger.error(result.error);
  }
}
