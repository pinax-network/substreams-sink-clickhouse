import { EntityChanges } from "@substreams/sink-entity-changes/zod";
import { z } from "zod";

export const TableChangeOperation = z.enum([
  "OPERATION_UNSPECIFIED",
  "OPERATION_CREATE",
  "OPERATION_UPDATE",
  "OPERATION_DELETE",
]);

export const Field = z.object({
  name: z.string(),
  newValue: z.string(),
  oldValue: z.string(),
});

export const CompositePrimaryKey = z.object({
  keys: z.array(z.tuple([z.string(), z.string()])),
});

export const PrimaryKey = z.union([
  z.object({
    id: z.string(),
  }),
  z.object({
    compositePk: CompositePrimaryKey,
  }),
]);

export const TableChange = z.union([
  // Simple primary key
  z.object({
    table: z.string(),
    pk: z.string(),
    ordinal: z.string(),
    operation: TableChangeOperation,
    fields: z.array(Field),
  }),
  // Composite primary key
  z.object({
    table: z.string(),
    compositePk: CompositePrimaryKey,
    ordinal: z.number(),
    operation: TableChangeOperation,
    fields: z.array(Field),
  }),
]);

export const DatabaseChanges = z.object({
  tableChanges: z.array(TableChange),
});

export type TableChangeOperation = z.infer<typeof TableChangeOperation>;
export type Field = z.infer<typeof Field>;
export type TableChange = z.infer<typeof TableChange>;
export type DatabaseChanges = z.infer<typeof DatabaseChanges>;
export type PrimaryKey = z.infer<typeof PrimaryKey>;
export type CompositePrimaryKey = z.infer<typeof CompositePrimaryKey>;

export const boolean = z
  .string()
  .transform((str) => str.toLowerCase() === "true")
  .or(z.boolean());

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
  finalBlockOnly: boolean,
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
  data: EntityChanges.or(DatabaseChanges),
});
export type PayloadBody = z.infer<typeof PayloadBody>;

export const BodySchema = z.union([PingBody, PayloadBody]);
export type BodySchema = z.infer<typeof BodySchema>;

export function getvaluesInTableChange(change: TableChange): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const field of change.fields) {
    values[field.name] = field.newValue;
  }
  return values;
}
