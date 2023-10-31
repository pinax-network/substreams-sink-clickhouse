import { readOnlyClient } from "../clickhouse/createClient.js";
import { logger } from "../logger.js";
import { BadRequest, toJSON } from "./cors.js";

export async function query(req: Request): Promise<Response> {
  try {
    const query = await req.text();
    const result = await readOnlyClient.query({ query, format: "JSONEachRow" });
    const data = await result.json();

    return toJSON(data);
  } catch (err) {
    logger.error(err);
    return BadRequest;
  }
}
