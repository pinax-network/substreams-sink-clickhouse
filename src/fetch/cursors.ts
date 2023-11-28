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
    const { table, chain } = parametersResult.payload;

    const query = `
    SELECT cursor, timestamp 
    FROM ${table} 
    WHERE chain = '${chain}'
    ORDER BY timestamp DESC
    LIMIT 1`;

    const response = await readOnlyClient.query({ query, format: "JSONEachRow" });
    const data = await response.json<Array<unknown>>();

    if (data.length === 1) {
      return toJSON(data[0]);
    }

    return toText(`Bad request: no cursor found for '${table}' on '${chain}'.`, 400);
  } catch (err) {
    logger.error(err);
  }
  return BadRequest;
}

async function verifyParameters(req: Request): Promise<Result<{ chain: string; table: string }, Response>> {
  const url = new URL(req.url);
  const chain = url.searchParams.get("chain");
  const table = url.searchParams.get("table");

  if (!chain) {
    return Err(toText("Missing parameter: chain", 400));
  }

  if (!table) {
    return Err(toText("Missing parameter: table", 400));
  }

  if (!(await store.chains).includes(chain)) {
    return Err(toText("Invalid parameter: chain=" + chain, 400));
  }

  if (!(await store.publicTables).includes(table)) {
    return Err(toText("Invalid parameter: table=" + table, 400));
  }

  return Ok({ chain, table });
}

async function getModuleHash(table: string, chain: string): Promise<string | null> {
  const query = `SELECT module_hash FROM ${table} WHERE chain = '${chain}'`;
  const response = await readOnlyClient.query({ query, format: "JSONEachRow" });
  const data = await response.json<Array<{ module_hash: string }>>();
  return data[0]?.module_hash ?? null;
}
