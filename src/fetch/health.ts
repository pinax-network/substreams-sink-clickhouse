import client from "../clickhouse/createClient.js";
import { logger } from "../logger.js";
import { BadRequest, toText } from "./cors.js";

function now() {
  return Math.floor(Date.now() / 1000); // seconds
}

// cache the timestamp and value for 1 seconds
let timestamp = now();
let value = true; // true = OK, false = ERROR

export default async function () {
  // return cached response if timestamp is less than 1 second old
  if ( now() - timestamp < 1 ) {
    return value ? toText("OK") : BadRequest;
  }

  try {
    const response = await client.ping();
    if (!response.success) {
      throw new Error(response.error.message);
    }
    timestamp = now();
    value = true;
    return toText("OK");
  } catch (e) {
    logger.error(e);
    timestamp = now();
    value = false;
    return BadRequest;
  }
}
