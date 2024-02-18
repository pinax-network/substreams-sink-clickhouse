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
  const chain = getChain(req, true);
  const module_hash = getModuleHash(req, false);
  const response = await readOnlyClient.query({ query_params: {chain}, query, format: "JSONEachRow" });
  let data = await response.json() as BlockResponseSchema[];

  // optional filter by param
  // if ( chain ) data = data.filter((row) => row.chain === chain);
  if ( module_hash ) data = data.filter((row) => row.module_hash === module_hash);
  return data;
}
