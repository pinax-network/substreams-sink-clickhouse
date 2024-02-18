import { logger } from "../logger.js";
import { readOnlyClient } from "./createClient.js";

export let chains: string[] | null = null;
export let module_hashes: string[] | null = null;
export let tables: Set<string> | null = null;
export let databases: Set<string> | null = null;
export let paused = false;

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
  logger.info('[store:query_chains]', `Total chains: ${chains.length} (${chains.join(", ")})`);

  return chains;
}

export async function query_module_hashes() {
  if (module_hashes) return module_hashes;
  module_hashes = await readOnlyClient
    .query({ query: "SELECT DISTINCT module_hash from module_hashes", format: "JSONEachRow" })
    .then((response) => response.json<Array<{ module_hash: string }>>())
    .then((moduleHashes) => moduleHashes.map(({ module_hash }) => module_hash))
    .catch(() => []);
  logger.info('[store:query_module_hashes]', `Total module_hashes: ${module_hashes.length}`);

  return module_hashes;
}

export function reset() {
  chains = null;
  module_hashes = null;
  tables = null;
  logger.info('[reset]', "Cache has been cleared");
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
