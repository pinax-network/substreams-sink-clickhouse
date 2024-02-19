import { ping } from "../clickhouse/ping.js";
import { BadRequest, toText } from "./cors.js";

function now() {
  return Math.floor(Date.now() / 1000); // seconds
}

// cache the timestamp and value for 1 seconds
let timestamp = now();
let cachedHealthValue = true;

export default async function health(): Promise<Response> {
  if (now() - timestamp < 1) {
    return cachedHealthValue ? toText("OK") : BadRequest;
  }

  // success
  try {
    await ping();
    timestamp = now();
    cachedHealthValue = true;
    return toText("OK");

  // failure
  } catch (e) {
    cachedHealthValue = false;
    return BadRequest;
  }
}
