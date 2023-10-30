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
    return new Response("Not implemented", { status: 400 });
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
