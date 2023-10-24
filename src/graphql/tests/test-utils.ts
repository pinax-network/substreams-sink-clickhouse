import { expect } from "bun:test";

export function expectSql(sql: string) {
  function removeWhitespace(str: string) {
    return str.replaceAll(/\s+/g, " ").trim();
  }

  return {
    toBe: function (expectedSql: string) {
      expect(removeWhitespace(sql)).toBe(removeWhitespace(expectedSql));
    },
    not: {
      toBe: function (expectedSql: string) {
        expect(removeWhitespace(sql)).not.toBe(removeWhitespace(expectedSql));
      },
    },
  };
}
