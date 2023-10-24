import { beforeEach, describe, expect, test } from "bun:test";
import { TableTranslator } from "../table-translator.js";
import { MockTableBuilder } from "./mock-table-builder.js";

describe("table-translator", () => {
  let mockBuilder: MockTableBuilder;

  beforeEach(() => {
    mockBuilder = new MockTableBuilder();
  });

  test("it should not convert an invalid schema", () => {
    const graphql = `id: ID!`;
    expect(() => TableTranslator.translate(graphql, mockBuilder)).toThrow();
  });

  test("it should convert to sql correctly", () => {
    const graphql = `
     type Element {
        id: ID
     }`;

    const output = TableTranslator.translate(graphql, mockBuilder);
    expect(output).toHaveLength(1);
    expect(mockBuilder.name).toBe("Element");
    // first value: id (the column name) | second value: id (the type defined in mock translator)
    expect(mockBuilder.fields.map((f) => f.trim())).toEqual(["id id"]);
    expect(mockBuilder.primaryKeys).toEqual(["id"]);
  });

  test("it should handle non-nullables correctly", () => {
    const graphql = `
     type Element {
        id: ID!
     }`;

    const output = TableTranslator.translate(graphql, mockBuilder);
    expect(output).toHaveLength(1);
    expect(mockBuilder.name).toBe("Element");
    // first value: id (the column name) | second value: id (the type defined in mock translator)
    expect(mockBuilder.fields.map((f) => f.trim())).toEqual(["id id NOT NULL"]);
    expect(mockBuilder.primaryKeys).toEqual(["id"]);
  });

  test("it should handle multiple entities", () => {
    const graphql = `
    type Element1 {
        id: ID!
    }
    
    type Element2 {
        name: String
        value: Int!
    }`;

    const output = TableTranslator.translate(graphql, mockBuilder);
    expect(output).toHaveLength(2);
  });

  test("it should throw when an entity contains an array", () => {
    const graphql = `
    type Element {
      id: [ID!]!
    }`;

    expect(() => TableTranslator.translate(graphql, mockBuilder)).toThrow();
  });

  test("it should parse all field types according to the provided dictionnary", () => {
    const graphql = `
    type Element {
      id: ID
      int: Int
      f: Float
      str: String
      bool: Boolean 
      bigi: BigInt
      bigd: BigDecimal
      bytes: Bytes
    }`;

    TableTranslator.translate(graphql, mockBuilder);
    expect(mockBuilder.name).toBe("Element");
    expect(mockBuilder.fields.map((f) => f.trim())).toEqual([
      "id id",
      "int int",
      "f float",
      "str string",
      "bool bool",
      "bigi big_int",
      "bigd big_decimal",
      "bytes bytes",
    ]);
    expect(mockBuilder.primaryKeys).toEqual(["id"]);
  });

  test("it should allow for many primary keys", () => {
    const graphql = `
    type Element {
      id: ID
      name: ID 
    }`;

    TableTranslator.translate(graphql, mockBuilder);
    expect(mockBuilder.name).toBe("Element");
    expect(mockBuilder.fields.map((f) => f.trim())).toEqual([
      "id id",
      "name id",
    ]);
    expect(mockBuilder.primaryKeys).toEqual(["id", "name"]);
  });
});
