import { readOnlyClient } from "../src/clickhouse/createClient.js";
import * as store from "../src/clickhouse/stores.js";
import { logger } from "../src/logger.js";

export async function findLatestCursor(req: Request) {
  const { module_hash, chain} = await paramsLatestCursor(req);
  logger.info("[sql::findLatestCursor]", { module_hash, chain });
  const query = await Bun.file(import.meta.dirname + "/cursor.sql").text()
  const response = await readOnlyClient.query({ query, format: "JSONEachRow" });
  const data = await response.json<Array<{latest_cursor: string}>>();

  if (data.length === 1) return data[0].latest_cursor;

  throw new Error(`Bad request: no cursor found for '${module_hash}' on '${chain}'.`);
}

async function paramsLatestCursor(req: Request) {
  const url = new URL(req.url);
  const chain = url.searchParams.get("chain");
  const module_hash = url.searchParams.get("module_hash");

  if (!chain) throw new Error("Missing parameter: chain");
  if (!module_hash) throw new Error("Missing parameter: module_hash");

  if (!(await store.query_chains()).includes(chain)) {
    await store.reset("chains");
    throw new Error("Invalid parameter: chain=" + chain);
  }

  if (!(await store.query_module_hashes()).includes(module_hash)) {
    await store.reset("module_hashes");
    throw new Error("Invalid parameter: module_hash=" + module_hash);
  }

  return { chain, module_hash };
}
