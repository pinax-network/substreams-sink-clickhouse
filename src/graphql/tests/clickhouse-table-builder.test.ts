import { beforeEach, describe, expect, test } from "bun:test";
import { ClickhouseTableBuilder } from "../builders/clickhouse-table-builder.js";
import { TableBuilder } from "../builders/table-builder.js";
import { expectSql } from "./test-utils.js";

describe("clickhouse-table-builder", () => {
  describe("clear", () => {
    test("it should return an empty sql template when cleared", () => {
      const builder = new ClickhouseTableBuilder();
      builder.addName("test table");
      builder.addFields(["foo UInt32", "test String"]);
      builder.addPrimaryKeys(["foo"]);

      const expected = `CREATE TABLE IF NOT EXISTS foo ( )
    ENGINE = MergeTree
    ORDER BY ()`;

      expectSql(builder.build()).not.toBe(expected);
      builder.clear();
      builder.addName("foo"); // We must add a name because the build() method will complain if there is no name
      expectSql(builder.build()).toBe(expected);
    });
  });

  let builder: TableBuilder;
  beforeEach(() => {
    builder = new ClickhouseTableBuilder();
  });

  test("it should convert to sql correctly", () => {
    builder.addName("Element");
    builder.addFields(["foo UInt32"]);
    builder.addPrimaryKeys(["foo"]);

    const expected = `
    CREATE TABLE IF NOT EXISTS Element (
        foo UInt32 
    )
    ENGINE = MergeTree
    ORDER BY (foo)`;

    const output = builder.build();
    expectSql(output).toBe(expected);
  });

  test("it should convert many fields to sql correctly", () => {
    builder.addName("Element");
    builder.addFields(["foo UInt32", "bar String", "baz Float64 NOT NULL"]);
    builder.addPrimaryKeys(["foo", "baz"]);

    const expected = `
    CREATE TABLE IF NOT EXISTS Element (
        foo UInt32,
        bar String,
        baz Float64 NOT NULL
    )
    ENGINE = MergeTree
    ORDER BY (foo, baz)`;

    const output = builder.build();
    expectSql(output).toBe(expected);
  });

  test("it should set tuple() as order by if none is passed", () => {
    const output = builder
      .addName("test table")
      .addFields(["foo String"])
      .build();

    expectSql(output).toBe(`CREATE TABLE IF NOT EXISTS test table (
    foo String
  )
  ENGINE = MergeTree
  ORDER BY ()`);
  });

  test("it should complain if there is no table name", () => {
    builder.addFields(["foo UInt32"]);
    builder.addPrimaryKeys(["foo"]);

    expect(() => builder.build()).toThrow("Expected a table name, found none.");
  });
});
