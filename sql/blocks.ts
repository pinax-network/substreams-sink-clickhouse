import { z } from "zod";
import { readOnlyClient } from "../src/clickhouse/createClient.js";

export const BlockResponseSchema = z.object({
  chain: z.string(),
  count: z.number(),
  distinctCount: z.number(),
  min: z.number(),
  max: z.number(),
  delta: z.number(),
  missing: z.number(),
});
export type BlockResponseSchema = z.infer<typeof BlockResponseSchema>;

export function getChain(req: Request, required = true) {
  const url = new URL(req.url);
  const chain = url.searchParams.get("chain");

  if (required && !chain) {
    throw Error("Missing parameter: chain");
  }
  return chain;
}

export async function blocks(req: Request) {
  const query = await Bun.file(import.meta.dirname + "/blocks.sql").text()
  const chain = getChain(req, false);
  const response = await readOnlyClient.query({ query, format: "JSONEachRow" });
  let data = await response.json() as BlockResponseSchema[];
  if ( chain ) data = data.filter((row) => row.chain === chain);
  return data;
}
