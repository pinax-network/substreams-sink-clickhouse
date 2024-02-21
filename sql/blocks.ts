import { z } from "zod";
import { readOnlyClient } from "../src/clickhouse/createClient.js";

export const BlockResponseSchema = z.object({
  chain: z.string().default("wax"),
  module_hash: z.string().default("0670acd8592c0e2aec694a1dafd065218b26360f"),
  count: z.number(),
  distinctCount: z.number(),
  min: z.number(),
  max: z.number(),
  delta: z.number(),
  missing: z.number(),
  optimize: z.number(),
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

export function getModuleHash(req: Request, required = true) {
  const url = new URL(req.url);
  const module_hash = url.searchParams.get("module_hash");

  if (required && !module_hash) {
    throw Error("Missing parameter: module_hash");
  }
  return module_hash;
}

export async function blocks(req: Request) {
  let query = await Bun.file(import.meta.dirname + "/blocks.sql").text()
  const chain = getChain(req, false);
  const module_hash = getModuleHash(req, false);
  const WHERE = [];
  if ( chain ) WHERE.push(`chain = ${chain}`);
  if ( module_hash ) WHERE.push(`module_hash = ${module_hash}`);
  if ( WHERE.length ) query += " WHERE " + WHERE.join(" AND ");
  query += "GROUP BY (chain, module_hash)";

  const response = await readOnlyClient.query({ query_params: {chain, module_hash}, query, format: "JSONEachRow" });
  let data = await response.json() as BlockResponseSchema[];

  return data;
}
