import client from "../clickhouse/createClient.js";
import { logger } from "../logger.js";
import { BadRequest, toText } from "./cors.js";

export default async function () {
  try {
    const response = await client.ping();
    if (!response.success) {
      throw new Error(response.error.message);
    }

    return toText("OK");
  } catch (e) {
    logger.error(e);
    return BadRequest;
  }
}
