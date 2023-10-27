import { readOnlyClient } from "../clickhouse/createClient.js";

export async function query(req: Request): Promise<Response> {
  try {
    const query = await req.text();
    const result = await readOnlyClient.query({ query, format: "JSONEachRow" });
    const data = await result.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response("Bad request: " + err, { status: 400 });
  }
}
