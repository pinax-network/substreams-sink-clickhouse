import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import EventEmitter from "events";
import { config, parseConfig } from "../config.js";

describe("config", () => {
  let skipTests = true;

  try {
    parseConfig(false);
    skipTests = false;
  } catch {}

  beforeAll(() => EventEmitter.setMaxListeners(Infinity));
  afterAll(() => EventEmitter.setMaxListeners(5));

  // This test ensures that every field is either optional or has a default value
  test("it should allow the sink to start without any configuration", () => {
    process.env = {};
    expect(() => parseConfig(false)).not.toThrow();
  });

  describe.skipIf(skipTests)("--port", () => {
    test("it should allow to specify a port", () => {
      expectConfiguration("port").with("3001", "PORT", "-p", "--port").toBe(3001);
    });

    test("it should fail on invalid port number", () => {
      expectConfiguration("port").with("-1", "PORT", "-p", "--port").toThrow();
    });
  });

  describe.skipIf(skipTests)("--verbose", () => {
    test("it should allow boolean values, 'pretty' and 'json'", () => {
      expectConfiguration("verbose").with("true", "VERBOSE", "-v", "--verbose").toBe(true);
      expectConfiguration("verbose").with("false", "VERBOSE", "-v", "--verbose").toBe(false);
      expectConfiguration("verbose").with("pretty", "VERBOSE", "-v", "--verbose").toBe("pretty");
      expectConfiguration("verbose").with("json", "VERBOSE", "-v", "--verbose").toBe("json");
    });

    test("it should fail on any other input", () => {
      expectConfiguration("verbose").with("1", "VERBOSE", "-v", "--verbose").toThrow();
      expectConfiguration("verbose").with("", "VERBOSE", "-v", "--verbose").toThrow();
    });
  });

  describe.skipIf(skipTests)("--schema-url", () => {
    test("it should allow no file input", () => {
      expectConfiguration("schemaUrl")
        .with(undefined, "SCHEMA_URL", "-s", "--schema-url")
        .toBe("./schema.sql");
    });

    test("it should not set a default schema url if the option is not passed in", () => {
      expectConfiguration("schemaUrl")
        .with(undefined, undefined, "--create-database")
        .toBe(undefined);
      expect(process.env);
    });

    test("it should allow a string input", () => {
      expectConfiguration("schemaUrl")
        .with("file.sql", "SCHEMA_URL", "-s", "--schema-url")
        .toBe("file.sql");
    });
  });

  describe.skipIf(skipTests)(
    "--public-key | --auth-key | --host | --database | --username | --password",
    () => {
      test("it should required any string", () => {
        expectConfiguration("publicKey").with("1234", "PUBLIC_KEY", "--public-key").toBe("1234");
        expectConfiguration("authKey").with("1234", "AUTH_KEY", "--auth-key").toBe("1234");
        expectConfiguration("host").with("1234", "HOST", "--host").toBe("1234");
        expectConfiguration("database").with("1234", "DATABASE", "--database").toBe("1234");
        expectConfiguration("username").with("1234", "USERNAME", "--username").toBe("1234");
        expectConfiguration("password").with("1234", "PASSWORD", "--password").toBe("1234");
      });
    }
  );

  describe.skipIf(skipTests)("--create-database", () => {
    test("it should allow boolean values", () => {
      expectConfiguration("createDatabase")
        .with("true", "CREATE_DATABASE", "--create-database")
        .toBe(true);
      expectConfiguration("createDatabase")
        .with("false", "CREATE_DATABASE", "--create-database")
        .toBe(false);
    });

    test("it should fail if any other value is passed in", () => {
      expectConfiguration("createDatabase")
        .with("random", "CREATE_DATABASE", "--create-database")
        .toThrow();
    });

    test("it should allow no values in the cli", () => {
      expectConfiguration("createDatabase").with("", undefined, "--create-database").toBe(true);
    });
  });

  describe.skipIf(skipTests)("--async-insert | --wait-for-insert", () => {
    test("it should allow 0 or 1 as an input", () => {
      expectConfiguration("asyncInsert").with("0", "ASYNC_INSERT", "--async-insert").toBe(0);
      expectConfiguration("waitForInsert")
        .with("0", "WAIT_FOR_INSERT", "--wait-for-insert")
        .toBe(0);

      expectConfiguration("asyncInsert").with("1", "ASYNC_INSERT", "--async-insert").toBe(1);
      expectConfiguration("waitForInsert")
        .with("1", "WAIT_FOR_INSERT", "--wait-for-insert")
        .toBe(1);
    });

    test("it should fail on any other input", () => {
      expectConfiguration("asyncInsert").with("2", "ASYNC_INSERT", "--async-insert").toThrow();
      expectConfiguration("waitForInsert")
        .with("2", "WAIT_FOR_INSERT", "--wait-for-insert")
        .toThrow();
    });
  });

  describe.skipIf(skipTests)("--queue-limit | --queue-concurrency", () => {
    test("it should allow to specify a positive number", () => {
      expectConfiguration("queueLimit").with("10", "QUEUE_LIMIT", "--queue-limit").toBe(10);
      expectConfiguration("queueConcurrency")
        .with("10", "QUEUE_CONCURRENCY", "--queue-concurrency")
        .toBe(10);
    });

    test("it should fail on invalid number", () => {
      expectConfiguration("queueLimit").with("-1", "QUEUE_LIMIT", "--queue-limit").toThrow();
      expectConfiguration("queueConcurrency")
        .with("-1", "QUEUE_CONCURRENCY", "--queue-concurrency")
        .toThrow();
    });
  });
});

function expectConfiguration(field: keyof typeof config) {
  return {
    with: function (input?: string, envField?: string, ...cliNames: string[]) {
      return {
        toBe: function (expected: unknown) {
          // Test only .env
          process.env = {};
          if (envField) {
            process.env = { [envField]: input };
            expect(() => parseConfig(false)).not.toThrow();
            expect(config[field]).toBe(expected);
          }
          process.env = {};

          // Test only cli
          for (const cliName of cliNames) {
            const argv = input ? ["", "", cliName, input] : ["", "", cliName];
            expect(() => parseConfig(false, argv)).not.toThrow();
            expect(config[field]).toBe(expected);
          }
        },

        toThrow: function () {
          // Test only .env
          process.env = {};
          if (envField) {
            process.env = { [envField]: input };
            expect(() => parseConfig(false)).toThrow();
          }
          process.env = {};

          // Test only cli
          for (const cliName of cliNames) {
            const argv = input !== undefined ? ["", "", cliName, input] : ["", "", cliName];
            expect(() => parseConfig(false, argv)).toThrow();
          }
        },
      };
    },
  };
}
