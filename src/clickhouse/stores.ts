import { logger } from "../logger.js";
import { readOnlyClient } from "./createClient.js";

class ClickhouseStore {
  public paused = false;

  private chainsPromise: Promise<string[]> | null = null;
  private moduleHashesPromises: Promise<string[]> | null = null;

  private knownTables = new Map<string, boolean>();

  public get chains() {
    if (!this.chainsPromise) {
      this.chainsPromise = readOnlyClient
        .query({ query: "SELECT DISTINCT chain FROM module_hashes", format: "JSONEachRow" })
        .then((response) => response.json<Array<{ chain: string }>>())
        .then((chains) => chains.map(({ chain }) => chain))
        .catch(() => []);
    }

    return this.chainsPromise;
  }

  public get moduleHashes() {
    if (!this.moduleHashesPromises) {
      this.moduleHashesPromises = readOnlyClient
        .query({ query: "SELECT DISTINCT module_hash from module_hashes", format: "JSONEachRow" })
        .then((response) => response.json<Array<{ module_hash: string }>>())
        .then((moduleHashes) => moduleHashes.map(({ module_hash }) => module_hash))
        .catch(() => []);
    }

    return this.moduleHashesPromises;
  }

  // in memory TABLE name cache
  // if true => true
  // if false => false
  // if undefined => check EXISTS if true or false
  public async existsTable(table: string) {
    // Return cached value if known (reduces number of EXISTS queries)
    if (this.knownTables.has(table)) {
      return this.knownTables.get(table);
    }

    // Check if table EXISTS
    const response = await readOnlyClient.query({
      query: "EXISTS " + table,
      format: "JSONEachRow",
    });

    // handle EXISTS response
    const data = await response.json<Array<{ result: 0 | 1 }>>();
    const exists = data[0]?.result === 1;
    this.knownTables.set(table, exists);

    logger.info('[existsTable]', `EXISTS [${table}=${exists}]`);
    return exists;
  }

  public reset() {
    this.chainsPromise = null;
    this.moduleHashesPromises = null;
    this.knownTables.clear();
    logger.info('[reset]', "Cache has been cleared");
  }
}

export const store = new ClickhouseStore();
