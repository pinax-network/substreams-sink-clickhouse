import { describe, expect, test } from "bun:test";
import { ConfigSchema, boolean, oneOrZero, positiveNumber } from "./config.js";

const config = ConfigSchema.parse({
  port: "3000",
  hostname: "0.0.0.0",
  publicKey: "a3cb7366ee8ca77225b4d41772e270e4e831d171d1de71d91707c42e7ba82cc9",
  host: "http://127.0.0.1:8123",
  schemaUrl: "./schema.sql",
  database: "default",
  username: "default",
  password: "",
  createDb: "false",
  queueLimit: "10",
  queueConcurrency: "10",
  verbose: "true",
  waitForAsyncInsert: "0",
  asyncInsert: "1",
  createDatabase: "false",
});

describe("ConfigSchema", () => {
  test("verbose", () => expect(config.verbose).toBe(true));
  test("port", () => expect(config.port).toBe(3000));
  test("queueLimit", () => expect(config.queueLimit).toBe(10));
  test("verbose", () => expect(config.verbose).toBe(true));
  test("schemaUrl", () => expect(config.schemaUrl).toBe("./schema.sql"));
  test("database", () => expect(config.database).toBe("default"));
  test("username", () => expect(config.username).toBe("default"));
  test("publicKey", () => expect(config.publicKey).toBe("a3cb7366ee8ca77225b4d41772e270e4e831d171d1de71d91707c42e7ba82cc9"));
  test("waitForAsyncInsert", () => expect(config.waitForAsyncInsert).toBe(0));
  test("asyncInsert", () => expect(config.asyncInsert).toBe(1));
  test("createDatabase", () => expect(config.createDatabase).toBe(false));
  test("boolean::true", () => expect(boolean.parse("true")).toBe(true));
  test("boolean::false", () => expect(boolean.parse("false")).toBe(false));
  test("oneOrZero::0", () => expect(oneOrZero.parse("0")).toBe(0));
  test("oneOrZero::1", () => expect(oneOrZero.parse("1")).toBe(1));
  test("positiveNumber::1", () => expect(positiveNumber.parse("1")).toBe(1));
});