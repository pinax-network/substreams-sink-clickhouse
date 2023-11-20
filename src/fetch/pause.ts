import { store } from "../clickhouse/stores.js";
import { logger } from "../logger.js";

export function handlePause(targetValue: boolean): Response {
  store.paused = targetValue;
  logger.info("Sink is now paused: " + store.paused);
  return new Response();
}
