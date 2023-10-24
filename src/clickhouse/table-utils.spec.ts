import { expect, test } from "bun:test";
import { getTableName, splitSchemaByTableCreation } from "./table-utils.js";

test("splitSchemaByTableCreation", () => {
  const schema = `
    --a comment
    CREATE TABLE foo (num UInt64)
    ENGINE MergeTree
    ORDER BY (num)

    CREATE TABLE foo (num UInt64)
    ENGINE MergeTree
    ORDER BY (num)

    CREATE TABLE IF NOT EXISTS bar (str UInt64)
    ENGINE MergeTree
    ORDER BY (str)`;

  const tables = splitSchemaByTableCreation(schema);

  expect(tables.length).toBe(3);

  expect(tables[0].includes("CREATE TABLE  foo")).toBeTrue();
  expect(tables[0].includes("ORDER BY (num)")).toBeTrue();
  expect(tables[1].includes("CREATE TABLE  foo")).toBeTrue();
  expect(tables[1].includes("ORDER BY (num)")).toBeTrue();
  expect(tables[2].includes("CREATE TABLE  IF NOT EXISTS bar")).toBeTrue();
  expect(tables[2].includes("ORDER BY (str)")).toBeTrue();
});

test("getTableName", () => {
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

  const differentName =
    "create table finishes_with_on (num UInt32) ENGINE MergeTree ORDER BY (num)";

  const tableName = getTableName(differentName);
  expect(tableName).toBe("finishes_with_on");
});
