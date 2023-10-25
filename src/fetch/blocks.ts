import { z } from "zod";
import client from "../clickhouse/createClient.js";

type BlockViewType = Array<{
  count: string;
  count_distinct: string;
  max: number;
  min: number;
  delta: string;
  missing: string;
}>;

export const BlockResponseSchema = z.object({
  count: z.number(),
  distinctCount: z.number(),
  min: z.number(),
  max: z.number(),
  delta: z.number(),
  missing: z.number(),
});
export type BlockResponseSchema = z.infer<typeof BlockResponseSchema>;

export async function blocks(): Promise<Response> {
  const query = `
    SELECT
        COUNT() AS count,
        COUNTDISTINCT(block_number) AS count_distinct,
        MAX(block_number) AS max,
        MIN(block_number) AS min,
        MAX(block_number) - MIN(block_number) AS delta,
        MAX(block_number) - COUNTDISTINCT(block_number) - MIN(block_number) AS missing
    FROM blocks
    `;

  try {
    const response = await client.query({ query, format: "JSONEachRow" });
    const data = await response.json<BlockViewType>();

    const dto: BlockResponseSchema = {
      distinctCount: parseInt(data[0].count_distinct),
      count: parseInt(data[0].count),
      max: data[0].max,
      min: data[0].min,
      delta: parseInt(data[0].delta),
      missing: parseInt(data[0].missing),
    };

    return new Response(JSON.stringify(dto), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(err instanceof Error ? err.message : JSON.stringify(err), { status: 500 });
  }
}
