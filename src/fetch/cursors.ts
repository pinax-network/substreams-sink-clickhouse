import { readOnlyClient } from "../clickhouse/createClient.js";
import { store } from "../clickhouse/stores.js";
import { logger } from "../logger.js";
import { BadRequest, toJSON, toText } from "./cors.js";

export async function findLatestCursor(req: Request): Promise<Response> {
  const parametersResult = await verifyParameters(req);
  if (parametersResult instanceof Response) {
    return parametersResult;
  }

  try {
    const { table, chain } = parametersResult;

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
    return BadRequest;
  }
}

export async function findCursorsForMissingBlocks(req: Request): Promise<Response> {
  const parametersResult = await verifyParameters(req);
  if (parametersResult instanceof Response) {
    return parametersResult;
  }

  try {
    const { table, chain } = parametersResult;

    const moduleHash = await getModuleHash(table, chain);
    if (!moduleHash) {
      throw new Error("Could not find module hash");
    }

    // This query finds every block that does not have a next block (beginning of a missing range).
    // It then pairs it with the first existing block after it (end of missing range).
    // If the start block is the last one in the database (max value), it is ignored.
    // When every range is found, they are joined with the 'cursors' table
    // to find which cursor is associated with the min and max boundaries.
    // The module_hash and the chain are used to determine the correct values to use.
    const query = `
SELECT block_ranges.from AS from_block_number, c1.cursor AS from_cursor, block_ranges.to AS to_block_number, c2.cursor AS to_cursor
FROM (
    SELECT c1.block_number AS from, MIN(c2.block_number) AS to
    FROM cursors c1, cursors c2, (
        SELECT MAX(block_number) AS block_number
        FROM cursors
        WHERE chain = '${chain}' AND module_hash = '${moduleHash}'
    ) AS maximum
    WHERE c1.block_number + 1 NOT IN (SELECT block_number FROM cursors WHERE chain = '${chain}' AND module_hash = '${moduleHash}')
    AND c1.chain = '${chain}'
    AND c2.chain = '${chain}'
    AND c1.block_number <> maximum.block_number
    AND c2.block_number > c1.block_number
    AND c1.module_hash = '${moduleHash}'
    AND c2.module_hash = '${moduleHash}'
    GROUP BY c1.block_number
) AS block_ranges
JOIN cursors c1 ON block_ranges.from = c1.block_number AND c1.chain = '${chain}' AND c1.module_hash = '${moduleHash}'
JOIN cursors c2 ON block_ranges.to   = c2.block_number AND c2.chain = '${chain}' AND c2.module_hash = '${moduleHash}'`;

    const response = await readOnlyClient.query({ query, format: "JSONEachRow" });
    const data = await response.json<
      Array<{
        from_block_number: number;
        from_cursor: string;
        to_block_number: number;
        to_cursor: string;
      }>
    >();

    const dto = data.map((record) => ({
      from: { block: record.from_block_number, cursor: record.from_cursor },
      to: { block: record.to_block_number, cursor: record.to_cursor },
    }));

    return toJSON(dto);
  } catch (err) {
    logger.error(err);
  }
  return BadRequest;
}

async function verifyParameters(
  req: Request
): Promise<{ chain: string; table: string } | Response> {
  const url = new URL(req.url);
  const chain = url.searchParams.get("chain");
  const table = url.searchParams.get("table");

  if (!chain) {
    return toText("Missing parameter: chain", 400);
  }

  if (!table) {
    return toText("Missing parameter: table", 400);
  }

  if (!(await store.chains).includes(chain)) {
    return toText("Invalid parameter: chain=" + chain, 400);
  }

  if (!(await store.publicTables).includes(table)) {
    return toText("Invalid parameter: table=" + table, 400);
  }

  return { chain, table };
}

async function getModuleHash(table: string, chain: string): Promise<string | null> {
  const query = `SELECT module_hash FROM ${table} WHERE chain = '${chain}'`;
  const response = await readOnlyClient.query({ query, format: "JSONEachRow" });
  const data = await response.json<Array<{ module_hash: string }>>();
  return data[0]?.module_hash ?? null;
}
