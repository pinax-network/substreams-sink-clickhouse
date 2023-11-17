import { createDatabase } from "../clickhouse/createDatabase.js";
import { ping } from "../clickhouse/ping.js";
import { initializeDefaultTables } from "../clickhouse/table-initialization.js";
import { config } from "../config.js";
import { logger } from "../logger.js";
import { BadRequest, toText } from "./cors.js";

export default async function () {
  const initializationSteps = [
    { step: ping, failureMessage: "Ping request failed" },
    { step: () => createDatabase(config.database), failureMessage: "Create database failed" },
    { step: initializeDefaultTables, failureMessage: "Initialize default tables failed" },
  ];

  for (const { step, failureMessage } of initializationSteps) {
    const result = await step();

    if (!result.success) {
      logger.error(`/init | ${failureMessage} | ${result.error}`);
      return BadRequest;
    }
  }

  return toText("OK");
}
