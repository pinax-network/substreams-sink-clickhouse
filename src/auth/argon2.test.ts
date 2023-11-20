import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { config } from "../config.js";
import * as argon2 from "./argon2.js";

const passwordHash =
  "$argon2id$v=19$m=65536,t=2,p=1$53yGw9x/71TwPK/jEX056kYMTLq+DIFAkCg2wIo+N7A$VGxk8EPwP8sLib1NDoo9YNh1eKLNCr2sy3uZywh5ayk";

describe("argon2", () => {
  let authKey: string | undefined = "";

  beforeEach(() => (authKey = config.authKey));
  afterEach(() => (config["authKey"] = authKey));

  test("it should skip auth check when no auth-key is passed in", () => {
    config["authKey"] = "";
    const request = new Request("http://localhost", {
      headers: { Authorization: "Bearer auth-key" },
    });

    const response = argon2.beforeHandle(request);
    expect(response.success).toBeTrue();
  });

  test("it should return 'unauthorized' on invalid password", () => {
    config["authKey"] = passwordHash;
    const request = new Request("http://localhost", { headers: { Authorization: "Bearer pwd" } });

    const response = argon2.beforeHandle(request);
    expect(response.success).toBeFalse();
    if (!response.success) {
      expect(response.error.status).toBe(401);
    }
  });

  test("it should allow valid passwords", () => {
    config["authKey"] = passwordHash;
    const request = new Request("http://localhost", {
      headers: { Authorization: "Bearer password" },
    });

    const response = argon2.beforeHandle(request);
    expect(response.success).toBeTrue();
  });
});
