import { EntityChange, Value } from "@substreams/sink-entity-changes/zod";

// TO-DO logic should be moved to @substreams/sink-entity-changes
export function getValuesInEntityChange(change: EntityChange): Record<string, unknown> {
  const values: Record<string, unknown> = {};

  for (const field of change.fields) {
    if (field.newValue) {
      const [key, value] = Object.entries(field.newValue)[0];
      if (value) {
        if (key === "array") {
          const array = value.value as Value[];
          values[field.name] = `[${array.map((obj) => Object.values(obj)[0]).join(", ")}]`;
        } else {
          values[field.name] = value;
        }
      }
    }
  }
  return values;
}
