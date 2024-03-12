import { z } from "zod";
import { readOnlyClient } from "../src/clickhouse/createClient.js";
import { config } from "../src/config.js";

export const ClusterSchema = z.object({
  count: z.number(),
  distinctCount: z.number(),
  min: z.number(),
  max: z.number(),
  delta: z.number(),
  missing: z.number(),
});
export type ClusterSchema = z.infer<typeof ClusterSchema>;

export async function cluster() {
  const query = await Bun.file(import.meta.dirname + "/cluster.sql").text()
  const response = await readOnlyClient.query({ query, query_params: {database: config.database}, format: "JSONEachRow" });
  return response.json();
}
