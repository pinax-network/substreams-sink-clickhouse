import { readOnlyClient } from "../clickhouse/createClient.js";
import { store } from "../clickhouse/stores.js";
import { logger } from "../logger.js";
import { Err, Ok, Result } from "../result.js";
import { BadRequest, toText } from "./cors.js";

export async function findLatestCursor(req: Request): Promise<Response> {
  const parametersResult = await verifyParameters(req);
  if (!parametersResult.success) {
    return parametersResult.error;
  }

  try {
    const { moduleHash, chain } = parametersResult.payload;

    const query = `
    SELECT latest_cursor
    FROM module_hashes
    WHERE chain = '${chain}' AND module_hash = '${moduleHash}'
    LIMIT 1`;

    const response = await readOnlyClient.query({ query, format: "JSONEachRow" });
    const data = await response.json<Array<{latest_cursor: string}>>();

    if (data.length === 1) {
      return toText(data[0].latest_cursor);
    }

    return toText(`Bad request: no cursor found for '${moduleHash}' on '${chain}'.`, 400);
  } catch (err) {
    logger.error(err);
  }
  return BadRequest;
}

async function verifyParameters(req: Request): Promise<Result<{ chain: string; moduleHash: string }, Response>> {
  const url = new URL(req.url);
  const chain = url.searchParams.get("chain");
  const moduleHash = url.searchParams.get("module_hash");

  if (!chain) {
    return Err(toText("Missing parameter: chain", 400));
  }

  if (!moduleHash) {
    return Err(toText("Missing parameter: module_hash", 400));
  }

  if (!(await store.chains).includes(chain)) {
    store.reset();
    return Err(toText("Invalid parameter: chain=" + chain, 400));
  }

  if (!(await store.moduleHashes).includes(moduleHash)) {
    store.reset();
    return Err(toText("Invalid parameter: moduleHash=" + moduleHash, 400));
  }

  return Ok({ chain, moduleHash });
}
