import { readOnlyClient } from "../clickhouse/createClient.js";
import { store } from "../clickhouse/stores.js";
import { logger } from "../logger.js";
import { Err, Ok, Result } from "../result.js";
import { BadRequest, toJSON, toText } from "./cors.js";

export async function findLatestCursor(req: Request): Promise<Response> {
  const parametersResult = await verifyParameters(req);
  if (!parametersResult.success) {
    return parametersResult.error;
  }

  try {
    const { moduleHash, chain } = parametersResult.payload;

    const query = `
    SELECT latest_cursor, latest_block_number
    FROM module_hashes
    WHERE chain = '${chain}' AND module_hash = '${moduleHash}'
    LIMIT 1`;

    const response = await readOnlyClient.query({ query, format: "JSONEachRow" });
    const data = await response.json<Array<unknown>>();

    if (data.length === 1) {
      return toJSON(data[0]);
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

async function getModuleHash(table: string, chain: string): Promise<string | null> {
  const query = `SELECT module_hash FROM ${table} WHERE chain = '${chain}'`;
  const response = await readOnlyClient.query({ query, format: "JSONEachRow" });
  const data = await response.json<Array<{ module_hash: string }>>();
  return data[0]?.module_hash ?? null;
}
