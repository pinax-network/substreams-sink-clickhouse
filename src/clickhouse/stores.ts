import { logger } from "../logger.js";
import { readOnlyClient } from "./createClient.js";

export let chains: string[] | null = null;
export let module_hashes: string[] | null = null;
export let tables: Set<string> | null = null;
export let databases: Set<string> | null = null;
export let paused = false;

export function check_table(table: string) {
  if (!tables) throw new Error("no tables are loaded");
  if (!tables.has(table)) {
    throw new Error(`table ${table} does not exist (call HTTP PUT "/sql/schema" to create table schemas)`);
  }
}

export function pause(value: boolean) {
  paused = value;
  logger.info('[store::pause]', `\tpaused=${paused}`);
  return value;
}

export async function query_chains() {
  if (chains) return chains;
  chains = await readOnlyClient
    .query({ query: "SELECT DISTINCT chain FROM module_hashes", format: "JSONEachRow" })
    .then((response) => response.json<Array<{ chain: string }>>())
    .then((chains) => chains.map(({ chain }) => chain))
    .catch(() => []);
  logger.info('[store::query_chains]', `Total chains: ${chains.length} (${chains.join(", ")})`);

  return chains;
}

export async function query_module_hashes() {
  if (module_hashes) return module_hashes;
  module_hashes = await readOnlyClient
    .query({ query: "SELECT DISTINCT module_hash from module_hashes", format: "JSONEachRow" })
    .then((response) => response.json<Array<{ module_hash: string }>>())
    .then((moduleHashes) => moduleHashes.map(({ module_hash }) => module_hash))
    .catch(() => []);
  logger.info('[store::query_module_hashes]', `Total module_hashes: ${module_hashes.length}`);

  return module_hashes;
}

export async function reset(type: "chains"| "module_hashes" | "tables" | "databases" | "all" = "all") {
  logger.info('[reset]', `cache reset for '${type}'`);
  switch (type) {
    case "chains":
      chains = null;
      await query_chains();
      break;
    case "module_hashes":
      module_hashes = null;
      await query_module_hashes();
      break;
    case "tables":
      tables = null;
      await show_tables();
      break;
    case "databases":
      databases = null;
      await show_databases();
      break;
    case "all":
      chains = null;
      module_hashes = null;
      tables = null;
      databases = null;
      await query_chains();
      await query_module_hashes();
      await show_tables();
      await show_databases();
      break;
  }
}

export async function show_tables() {
  const response = await readOnlyClient.query({
    query: "SHOW TABLES",
    format: "JSONEachRow",
  });
  const data = await response.json<{name: string}[]>();
  tables = new Set(data.map(({ name }) => name));
  logger.info('[store::show_tables]', `Loaded ${tables.size} tables (${[...tables].join(", ")})`);

  return tables;
}

export async function show_databases() {
  const response = await readOnlyClient.query({
    query: "SHOW DATABASES",
    format: "JSONEachRow",
  });
  const data = await response.json<{name: string}[]>();
  databases = new Set(data.map(({ name }) => name));
  logger.info('[store::show_databases]', `Loaded ${databases.size} databases (${[...databases].join(", ")})`);

  return databases;
}
