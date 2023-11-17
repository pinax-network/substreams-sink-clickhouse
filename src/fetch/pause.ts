import { store } from "../clickhouse/stores.js";

export function handlePause(targetValue: boolean): Response {
  store.paused = targetValue;
  return new Response();
}
