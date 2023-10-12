import { client } from "./clickhouse.js";
import { logger } from "./logger.js";

const query = `
CREATE TABLE IF NOT EXISTS manifest (
    module_hash FixedString(40),
    module_name String(),
    type        String(),
)
ENGINE = ReplacingMergeTree 
ORDER BY (module_hash);
`;

export function initializeManifest(): Promise<unknown> {
  logger.info("Initializing 'manifest' table.");
  return client.command({ query });
}
