import { Static, Type } from "@sinclair/typebox";
import { EntityChanges } from "@substreams/sink-entity-changes/typebox";

export const ClockSchema = Type.Object({
  timestamp: Type.String(),
  number: Type.Number(),
  id: Type.String(),
});
export type Clock = Static<typeof ClockSchema>;

export const ManifestSchema = Type.Object({
  substreamsEndpoint: Type.String(),
  moduleName: Type.String(),
  type: Type.String(),
  moduleHash: Type.String(),
  chain: Type.String(),
});
export type Manifest = Static<typeof ManifestSchema>;

export const BodySchema = Type.Union([
  Type.Object({ message: Type.Literal("PING") }),
  Type.Object({
    cursor: Type.String(),
    session: Type.Object({
      traceId: Type.String(),
      resolvedStartBlock: Type.Number(),
    }),
    clock: ClockSchema,
    manifest: ManifestSchema,
    data: EntityChanges,
  }),
]);
