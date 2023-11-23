import { saveKnownEntityChanges } from "./clickhouse/handleSinkRequest.js";
import { ping } from "./clickhouse/ping.js";
import { logger } from "./logger.js";

export async function resume() {
  const pingResult = await ping();
  if (!pingResult.success) {
    logger.error("Resume failed | Error: " + pingResult.error.message);
    return;
  }

  logger.info("Writing unsinked data to ClickHouse");
  const saveResult = await saveKnownEntityChanges();
  if (!saveResult.success) {
    logger.error("Resume failed | Error: " + saveResult.error.message);
    return;
  }

  logger.info("Resume completed.");
}
