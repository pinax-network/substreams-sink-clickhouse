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
    SELECT cursors.cursor AS cursor, timestamp 
    FROM cursors
    JOIN ${table} ON ${table}.block_id = cursors.block_id
    JOIN blocks   ON ${table}.block_id = blocks.block_id
    WHERE ${table}.chain = '${chain}'
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

    // This query finds every block that does not have a next block (beginning of a missing range).
    // It then pairs it with the first existing block after it (end of missing range).
    // If the start block is the last one in the database (max value), it is ignored.
    // When every range is found, they are joined with the specified ${table} and cursors,
    // to find which cursor is associated with the min and max boundaries.
    const query = `
SELECT from AS from_block_number, c1.cursor AS from_cursor, to AS to_block_number, c2.cursor AS to_cursor 
FROM ( 
    SELECT b1.block_number AS from, MIN(b2.block_number) AS to
    FROM blocks b1, blocks b2, (
        SELECT MAX(block_number) AS block_number
        FROM blocks
        WHERE chain = '${chain}'
    ) AS maximum
    WHERE b1.block_number + 1 NOT IN (SELECT block_number FROM blocks WHERE chain = '${chain}')
        AND b1.block_number <> maximum.block_number
        AND b1.chain = '${chain}'
        AND b1.chain = '${chain}'
        AND b2.block_number > b1.block_number
    GROUP BY b1.block_number 
) AS block_ranges
JOIN blocks   b1 ON b1.block_number = block_ranges.from AND b1.chain = '${chain}'
JOIN blocks   b2 ON b2.block_number = block_ranges.to   AND b2.chain = '${chain}'
JOIN ${table} t1 ON t1.block_id = b1.block_id           AND t1.chain = '${chain}'
JOIN ${table} t2 ON t2.block_id = b2.block_id           AND t2.chain = '${chain}'
JOIN cursors  c1 ON c1.block_id = t1.block_id           AND c1.chain = '${chain}'
JOIN cursors  c2 ON c2.block_id = t2.block_id           AND c2.chain = '${chain}'`;

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
    return BadRequest;
  }
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
