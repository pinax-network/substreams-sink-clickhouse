import { readOnlyClient } from "./createClient.js";

class ClickhouseStore {
  private chainsPromise: Promise<string[]> | null = null;
  private publicTablesPromise: Promise<string[]> | null = null;

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
}

export const store = new ClickhouseStore();
