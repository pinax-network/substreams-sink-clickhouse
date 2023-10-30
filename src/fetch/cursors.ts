import { readOnlyClient } from "../clickhouse/createClient.js";
import { store } from "../clickhouse/stores.js";

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
      return new Response(JSON.stringify(data[0]), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(`Bad request: no cursor found for '${table}' on '${chain}'.`, {
      status: 400,
    });
  } catch (err) {
    return new Response("Bad request", { status: 400 });
  }
}

export async function findCursorsForMissingBlocks(req: Request): Promise<Response> {
  const parametersResult = await verifyParameters(req);
  if (parametersResult instanceof Response) {
    return parametersResult;
  }

  try {
    const { table, chain } = parametersResult;

    const query = `
SELECT from AS from_block_number, c1.cursor AS from_cursor, to AS to_block_number, c2.cursor AS to_cursor
FROM blocks b1, blocks b2, ${table} t1, ${table} t2, cursors c1, cursors c2 (
    SELECT b1.block_number AS from, MIN(b2.block_number) AS to
    FROM blocks b1, blocks b2, (
        SELECT MAX(block_number) AS block_number
        FROM blocks
        WHERE chain = '${chain}'
    ) maximum
    WHERE b1.block_number + 1 NOT IN (SELECT block_number FROM blocks WHERE chain = '${chain}')
        AND b1.block_number <> maximum.block_number
        AND b1.chain = '${chain}'
        AND b1.chain = '${chain}'
        AND b2.block_number > b1.block_number
    GROUP BY b1.block_number) AS block_ranges,
WHERE b1.block_number = block_ranges.FROM AND b2.block_number = block_ranges.to AND b1.chain = '${chain}' and b2.chain = '${chain}'
    AND t1.block_id = b1.block_id AND t2.block_id = b2.block_id AND t1.chain = '${table}' AND t2.chain = '${chain}'
    AND c1.block_id = b1.block_id AND c2.block_id = b2.block_id AND c1.chain = '${table}' AND c2.chain = '${chain}'`;

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

    return new Response(JSON.stringify(dto), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response("Bad request", { status: 400 });
  }
}

async function verifyParameters(
  req: Request
): Promise<{ chain: string; table: string } | Response> {
  const url = new URL(req.url);
  const chain = url.searchParams.get("chain");
  const table = url.searchParams.get("table");

  if (!chain) {
    return new Response("Missing parameter: chain", { status: 400 });
  }

  if (!table) {
    return new Response("Missing parameter: table", { status: 400 });
  }

  if (!(await store.chains).includes(chain)) {
    return new Response("Invalid parameter: chain=" + chain, { status: 400 });
  }

  if (!(await store.publicTables).includes(table)) {
    return new Response("Invalid parameter: table=" + table, { status: 400 });
  }

  return { chain, table };
}
