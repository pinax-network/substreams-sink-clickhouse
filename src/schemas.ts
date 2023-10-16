import { EntityChanges } from "@substreams/sink-entity-changes/zod";
import z from "zod";

export const ClockSchema = z.object({
  timestamp: z.string(),
  number: z.number(),
  id: z.string(),
});
export type Clock = z.infer<typeof ClockSchema>;

export const ManifestSchema = z.object({
  substreamsEndpoint: z.string(),
  moduleName: z.string(),
  type: z.string(),
  moduleHash: z.string(),
  chain: z.string(),
});
export type Manifest = z.infer<typeof ManifestSchema>;

export const PingBody = z.object({ message: z.literal("PING") });
export const PayloadBody = z.object({
  cursor: z.string(),
  session: z.object({
    traceId: z.string(),
    resolvedStartBlock: z.number(),
  }),
  clock: ClockSchema,
  manifest: ManifestSchema,
  data: EntityChanges,
});
export type PayloadBody = z.infer<typeof PayloadBody>;

export const BodySchema = z.union([PingBody, PayloadBody]);
export type BodySchema = z.infer<typeof BodySchema>;

export const TableInitSchema = z.string();
export type TableInitSchema = z.infer<typeof TableInitSchema>;
