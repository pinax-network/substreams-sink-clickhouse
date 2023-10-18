import { describe, expect, test } from "bun:test";
import { getTableName, splitSchemaByTableCreation } from "../table-utils.js";

describe("table-utils", () => {
  describe("splitSchemByTableCreation", () => {
    test("it should extract the table creation queries", () => {
      const schema = `CREATE TABLE foo (num UInt64)    
       ENGINE MergeTree
       ORDER BY (num)
    
       CREATE TABLE IF NOT EXISTS bar (str UInt64)
       ENGINE MergeTree
       ORDER BY (str)`;

      const tables = splitSchemaByTableCreation(schema);

      expect(tables.length).toBe(2);

      expect(tables[0].tableName).toBe("foo");
      expect(tables[1].tableName).toBe("bar");

      expect(tables[0].query.includes("CREATE TABLE  foo")).toBeTrue();
      expect(tables[0].query.includes("ORDER BY (num)")).toBeTrue();
      expect(
        tables[1].query.includes("CREATE TABLE  IF NOT EXISTS bar")
      ).toBeTrue();
      expect(tables[1].query.includes("ORDER BY (str)")).toBeTrue();
    });
  });

  describe("getTableName", () => {
    test("it should find the table name from the query", () => {
      const queries = [
        `CREATE TABLE foo (num UInt64) 
        ENGINE MergeTree
        ORDER BY (num)`,

        `CREATE TABLE db_name.foo (num UInt64)
        ENGINE MergeTree
        ORDER BY (num)`,

        `CREATE TABLE db_name.foo ON shard_1 (str FixedString(12))
        ENGINE MergeTree
        ORDER BY (str)`,

        `create table if not exists foo (num UInt64)
        engine MergreTree
        order by (num)`,
      ];

      for (const query of queries) {
        const tableName = getTableName(query);
        expect(tableName).toBe("foo");
      }
    });
  });
});
