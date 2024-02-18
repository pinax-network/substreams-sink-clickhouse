import { describe, expect, test } from "bun:test";
import { ConfigSchema, boolean, oneOrZero, positiveNumber } from "./schemas.js";

test("boolean::true", () => expect(boolean.parse("true")).toBe(true));
test("boolean::false", () => expect(boolean.parse("false")).toBe(false));
test("oneOrZero::0", () => expect(oneOrZero.parse("0")).toBe(0));
test("oneOrZero::1", () => expect(oneOrZero.parse("1")).toBe(1));
test("positiveNumber::1", () => expect(positiveNumber.parse("1")).toBe(1));

const config = ConfigSchema.parse({
  port: "3000",
  hostname: "0.0.0.0",
  publicKey: "a3cb7366ee8ca77225b4d41772e270e4e831d171d1de71d91707c42e7ba82cc9",
  host: "http://127.0.0.1:8123",
  database: "default",
  username: "default",
  password: "",
  verbose: "true",
});

describe("ConfigSchema", () => {
  test("verbose", () => expect(config.verbose).toBe(true));
  test("port", () => expect(config.port).toBe(3000));
  test("verbose", () => expect(config.verbose).toBe(true));
  test("database", () => expect(config.database).toBe("default"));
  test("username", () => expect(config.username).toBe("default"));
  test("publicKey", () =>
    expect(config.publicKey).toEqual(["a3cb7366ee8ca77225b4d41772e270e4e831d171d1de71d91707c42e7ba82cc9"]));
});
