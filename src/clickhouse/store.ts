import { logger } from "../logger.js";
import { readOnlyClient } from "./createClient.js";

const knownModuleHashes = new Set<string>();
const knownTables = new Map<string, boolean>();

export function isKnownModuleHash(moduleHash: string) {
  if (!knownModuleHashes.has(moduleHash)) {
    knownModuleHashes.add(moduleHash);
    return true;
  }
  return false;
}

// in memory TABLE name cache
// if true => true
// if false => false
// if undefined => check EXISTS if true or false
export async function existsTable(table: string) {
  // Return cached value if known (reduces number of EXISTS queries)
  if (knownTables.has(table)) return knownTables.get(table);

  // Check if table EXISTS
  const response = await readOnlyClient.query({
    query: "EXISTS " + table,
    format: "JSONEachRow",
  });

  // handle EXISTS response
  const data = await response.json<Array<{ result: 0 | 1 }>>();
  const exists = data[0]?.result === 1;
  knownTables.set(table, exists);

  logger.info(`EXISTS [${table}=${exists}]`);
  return exists;
}
