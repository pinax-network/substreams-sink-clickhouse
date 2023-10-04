import { Static, Type } from "@sinclair/typebox";

export const EntityChangeOperation = Type.Enum({
  UNSPECIFIED: "OPERATION_UNSPECIFIED",
  CREATE: "OPERATION_CREATE",
  UPDATE: "OPERATION_UPDATE",
  DELETE: "OPERATION_DELETE",
  FINAL: "OPERATION_FINAL",
});

export const Value = Type.Union([
  Type.Object({ int32: Type.Number() }),
  Type.Object({ bigdecimal: Type.String() }),
  Type.Object({ bigint: Type.String() }),
  Type.Object({ string: Type.String() }),
  Type.Object({ bytes: Type.String() }),
  Type.Object({ bool: Type.Boolean() }),
  Type.Object({ array: Type.Array(Type.Unknown()) }),
  Type.Object({ undefined: Type.Optional(Type.Undefined()) }),
]);

export const Field = Type.Object({
  name: Type.String(),
  newValue: Type.Optional(Value),
});

export const EntityChange = Type.Object({
  entity: Type.String(),
  id: Type.String(),
  ordinal: Type.String(),
  operation: EntityChangeOperation,
  fields: Type.Array(Field),
});

export const EntityChanges = Type.Object({
  entityChanges: Type.Array(EntityChange),
});

export type EntityChangeOperation = Static<typeof EntityChangeOperation>;
export type Value = Static<typeof Value>;
export type Field = Static<typeof Field>;
export type EntityChange = Static<typeof EntityChange>;
export type EntityChanges = Static<typeof EntityChanges>;
