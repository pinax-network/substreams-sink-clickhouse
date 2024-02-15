import { saveKnownEntityChanges } from "./clickhouse/handleSinkRequest.js";
import { ping } from "./clickhouse/ping.js";
import { logger } from "./logger.js";

export async function resume() {
  const pingResult = await ping();
  if (!pingResult.success) {
    logger.error("[resume]", "Error: " + pingResult.error.message);
    return;
  }

  logger.info("[resume]", "writing unsinked data to ClickHouse...");
  const saveResult = await saveKnownEntityChanges();
  if (!saveResult.success) {
    logger.error("[resume]", "Error: " + saveResult.error.message);
    return;
  }
  logger.info("[resume]", "completed");
}
