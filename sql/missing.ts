import { z } from "zod";
import { readOnlyClient } from "../src/clickhouse/createClient.js";
import { getChain, getModuleHash } from "./blocks.js";

export const MissingResponseSchema = z.object({
  start_block: z.number(),
  stop_block: z.number(),
  missing: z.number(),
});

export type MissingResponseSchema = z.infer<typeof MissingResponseSchema>;

export async function missing(req: Request) {
  let query = await Bun.file(import.meta.dirname + "/missing.sql").text()
  const chain = getChain(req, true);
  const module_hash = getModuleHash(req, true);
  const response = await readOnlyClient.query({ query_params: {chain, module_hash}, query, format: "JSONEachRow" });
  return await response.json() as MissingResponseSchema[];
}
