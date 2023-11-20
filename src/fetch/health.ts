import { ping } from "../clickhouse/ping.js";
import { BadRequest, toText } from "./cors.js";

function now() {
  return Math.floor(Date.now() / 1000); // seconds
}

// cache the timestamp and value for 1 seconds
let timestamp = now();
let cachedHealthValue = true;

export default async function (): Promise<Response> {
  if (now() - timestamp < 1) {
    return cachedHealthValue ? toText("OK") : BadRequest;
  }

  const pingResult = await ping();
  timestamp = now();

  if (!pingResult.success) {
    cachedHealthValue = false;
    return BadRequest;
  }

  cachedHealthValue = true;
  return toText("OK");
}
