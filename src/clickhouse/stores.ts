import { logger } from "../logger.js";
import { readOnlyClient } from "./createClient.js";

class ClickhouseStore {
  private chainsPromise: Promise<string[]> | null = null;
  private publicTablesPromise: Promise<string[]> | null = null;

  private knownTables = new Map<string, boolean>();

  public get chains() {
    if (!this.chainsPromise) {
      this.chainsPromise = readOnlyClient
        .query({ query: "SELECT DISTINCT chain FROM blocks", format: "JSONEachRow" })
        .then((response) => response.json<Array<{ chain: string }>>())
        .then((chains) => chains.map(({ chain }) => chain))
        .catch(() => []);
    }

    return this.chainsPromise;
  }

  public get publicTables() {
    if (!this.publicTablesPromise) {
      const hiddenTables = ["blocks", "module_hashes", "cursors", "final_blocks"];
      this.publicTablesPromise = readOnlyClient
        .query({ query: "SHOW TABLES", format: "JSONEachRow" })
        .then((response) => response.json<Array<{ name: string }>>())
        .then((names) => names.map(({ name }) => name))
        .then((names) => names.filter((table) => !hiddenTables.includes(table)))
        .catch(() => []);
    }

    return this.publicTablesPromise;
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

    logger.info(`EXISTS [${table}=${exists}]`);
    return exists;
  }
}

export const store = new ClickhouseStore();
