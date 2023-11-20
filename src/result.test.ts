import { describe, expect, test } from "bun:test";
import { Err, Ok } from "./result.js";

describe("result", () => {
  test("Err", () => {
    const result = Err(new Error("test error"));
    expect(result.success).toBeFalse();
    if (!result.success) {
      expect(result.error.message).toBe("test error");
    }

    // @ts-expect-error
    result.payload;
  });

  test("Err different type", () => {
    const result = Err<string>("test error");
    expect(result.success).toBeFalse();
    if (!result.success) {
      expect(result.error).toBe("test error");
    }
  });

  test("Ok", () => {
    const result = Ok();
    expect(result.success).toBeTrue();
    expect("payload" in result).toBeFalse();

    // @ts-expect-error
    result.payload;
    // @ts-expect-error
    result.error;
  });

  test("Ok payload", () => {
    const result = Ok("test payload");
    expect(result.success).toBeTrue();
    if (result.success) {
      expect(result.payload).toBe("test payload");
    }

    // @ts-expect-error
    result.error;
  });
});
