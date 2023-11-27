import { EntityChanges } from "@substreams/sink-entity-changes/zod";
import z from "zod";

export const boolean = z
  .string()
  .transform((str) => str.toLowerCase() === "true")
  .or(z.boolean());
export const positiveNumber = z.coerce.number().pipe(z.number().positive());
export const oneOrZero = z.coerce.number().pipe(z.literal(0).or(z.literal(1)));

export const ConfigSchema = z.object({
  publicKey: z
    .string()
    .transform((str) => str.split(","))
    .refine((publicKeys) => publicKeys.filter((key) => key.length > 0).length > 0, "No primary key has been set"),
  authKey: z.optional(z.string().transform((str) => str.replaceAll("\\$", "$"))),
  port: positiveNumber,
  verbose: boolean,
  host: z.string(),
  hostname: z.string(),
  database: z.string(),
  username: z.string(),
  password: z.string(),
  asyncInsert: oneOrZero,
  waitForAsyncInsert: oneOrZero,
  maxBufferSize: positiveNumber,
  insertionDelay: positiveNumber,
  allowUnparsed: boolean,
  resume: boolean,
  buffer: z.string(),
});
export type ConfigSchema = z.infer<typeof ConfigSchema>;

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
  data: EntityChanges,
});
export type PayloadBody = z.infer<typeof PayloadBody>;

export const BodySchema = z.union([PingBody, PayloadBody]);
export type BodySchema = z.infer<typeof BodySchema>;

export const TableInitSchema = z.string();
export type TableInitSchema = z.infer<typeof TableInitSchema>;
