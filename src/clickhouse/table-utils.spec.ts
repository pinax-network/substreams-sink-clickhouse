import { expect, test } from "bun:test";
import {
  augmentCreateTableStatement,
  getTableName,
  splitSchemaByTableCreation,
} from "./table-utils.js";

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

test("augmentCreateTableStatement", () => {
  const queries = [
    {
      input: `create table foo (id UInt32) engine = MergeTree order by ()`,
      expectedToInclude: ["create table foo (", ") engine = MergeTree order by ()"],
    },
    {
      input: `create table default.foo (str String) engine = MergeTree order by ()`,
      expectedToInclude: ["create table default.foo (", ") engine = MergeTree order by ()"],
    },
    {
      input: `CREATE TABLE foo ON cluster (id FixedString(12)) ORDER BY ()`,
      expectedToInclude: ["CREATE TABLE foo ON cluster (", ") ORDER BY ()"],
    },
  ];

  for (const { input, expectedToInclude } of queries) {
    // test 1
    let augmentedTable = augmentCreateTableStatement(input, []);
    expect(augmentedTable).toBe(input);
    for (const expected of expectedToInclude) {
      expect(augmentedTable).toInclude(expected);
    }

    // test 2
    augmentedTable = augmentCreateTableStatement(input, ["test UInt128"]);
    expect(augmentedTable).toInclude(" test UInt128, ");
    for (const expected of expectedToInclude) {
      expect(augmentedTable).toInclude(expected);
    }

    // test 3
    augmentedTable = augmentCreateTableStatement(input, ["test UInt128", "test2 FixedString(10)"]);
    expect(augmentedTable).toInclude(" test UInt128, ");
    expect(augmentedTable).toInclude(" test2 FixedString(10), ");
    for (const expected of expectedToInclude) {
      expect(augmentedTable).toInclude(expected);
    }
  }
});
