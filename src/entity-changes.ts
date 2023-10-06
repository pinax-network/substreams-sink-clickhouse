import { EntityChange } from "@substreams/sink-entity-changes/typebox";

export function getValuesInEntityChange(
  change: EntityChange
): Record<string, unknown> {
  const values: Record<string, unknown> = {};

  for (const field of change.fields) {
    if (field.newValue) {
      const value = Object.values(field.newValue)[0];
      if (value) {
        if (Array.isArray(value)) {
          values[field.name] = "[" + value.join(", ") + "]";
        } else {
          values[field.name] = value;
        }
      }
    }
  }

  return values;
}
