import { EntityChange } from "@substreams/sink-entity-changes/zod";
import { describe, expect, test } from "bun:test";
import { getValuesInEntityChange } from "../entity-changes.js";

describe("entity-changes", () => {
  test("it should parse fields out of entity-changes correctly", () => {
    const change: Partial<EntityChange> = {
      fields: [
        { name: "value a", newValue: { string: "a string" } },
        { name: "value b", newValue: { int32: 1 } },
        { name: "value c", newValue: { bigint: "12345" } },
        { name: "value d", newValue: { bigdecimal: "1234.5678" } },
        { name: "value e", newValue: { bool: true } },
        { name: "value f", newValue: { bytes: "eeff" } },
        { name: "value g", newValue: { undefined: undefined } },
        { name: "value h", newValue: { array: [1, 2, 3, 4] } },
      ],
    };

    const values = getValuesInEntityChange(change as EntityChange);
    expect(values).toEqual({
      "value a": "a string",
      "value b": 1,
      "value c": "12345",
      "value d": "1234.5678",
      "value e": true,
      "value f": "eeff",
      "value h": "[1, 2, 3, 4]",
    });
  });
});
