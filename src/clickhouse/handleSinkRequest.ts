import { getValuesInTableChange } from "@substreams/sink-database-changes";
import { TableChange } from "@substreams/sink-database-changes/zod";
import { getValuesInEntityChange } from "@substreams/sink-entity-changes";
import { EntityChange } from "@substreams/sink-entity-changes/zod";
import { Clock, Manifest } from "substreams-sink-webhook/schemas";
import * as prometheus from "../prometheus.js";
import { PayloadBody } from "../schemas.js";
import { client } from "./createClient.js";
import * as store from "./stores.js";
import logUpdate from 'log-update';
import { logger } from "../logger.js";

type Metadata = { clock: Clock; manifest: Manifest; cursor: string };

const buffer = new Map<string, Record<string, unknown>[]>()

function now() {
  return Math.floor(new Date().getTime() / 1000);
}

let entities = 0;
let blocks = 0;
let inserts = 0;
let start = now();
let lastUpdate = now();

function bufferCount() {
  let count = 0
  for ( const value of buffer.values() ) {
    count += value.length;
  };
  return count;
}

// TO-DO - use Prometheus metrics as input to this function
function logProgress() {
  const delta = now() - start
  const blockRate = Math.round(blocks / delta);
  const entitiesRate = Math.round(entities / delta);
  const insertsRate = Math.round(inserts / delta);
  const count = bufferCount();
  blocks++;
  logUpdate(`[clickhouse::handleSinkRequest] blocks=${blocks} [${blockRate}/s] entities=${entities} [${entitiesRate}/s] inserts=${inserts} [${insertsRate}/s] buffer=${count}`);
}

export async function flushBuffer(verbose = false) {
  // clear buffer every 1 second
  if ( lastUpdate != now() ) {
    for ( const [table, values] of buffer.entries() ) {
      await client.insert({table, values, format: "JSONEachRow"})
      if ( verbose ) logger.info('[handleSinkRequest]', `\tinserted ${values.length} rows into ${table}`);
      buffer.delete(table);
      inserts++;
    }
    lastUpdate = now();
  }
}

// ~200-500 blocks per second
export async function handleSinkRequest({ data, ...metadata }: PayloadBody) {
  // Different handler if `graph_out` or `db_out` is emitting data.
  // Handles no incoming data as well.
  if ("entityChanges" in data && data.entityChanges.length > 0) {
    handleEntityChanges(data.entityChanges, metadata);
  } else if ("tableChanges" in data && data.tableChanges.length > 0) {
    handleDatabaseChanges(data.tableChanges, metadata);
  }

  // insert metadata
  insertModuleHashes(metadata);
  insertBlocks(metadata);

  await flushBuffer();

  // logging
  prometheus.sink_requests.inc({
    chain: metadata.manifest.chain,
    module_hash: metadata.manifest.moduleHash,
  });
  logProgress();

  return new Response("OK");
}

function insertModuleHashes(metadata: Metadata) {
  const values = {
    chain: metadata.manifest.chain,
    module_hash: metadata.manifest.moduleHash,
    module_name: metadata.manifest.moduleName,
    type: metadata.manifest.type,
    latest_cursor: metadata.cursor,
    latest_block_number: metadata.clock.number,
    latest_block_id: metadata.clock.id,
    latest_timestamp: Number(new Date(metadata.clock.timestamp)),
  };
  insertToBuffer("module_hashes", values);
}

function insertBlocks(metadata: Metadata) {
  const values = {
    chain: metadata.manifest.chain,
    module_hash: metadata.manifest.moduleHash,
    block_number: metadata.clock.number,
    timestamp: Number(new Date(metadata.clock.timestamp)),
    block_id: metadata.clock.id,
  };
  insertToBuffer("blocks", values);
}

function insertToBuffer(table: string, values: Record<string, unknown>) {
  // throw error if tables are not loaded
  if (!store.tables) throw new Error("no tables are loaded");
  if (!store.tables.has(table)) {
    throw new Error(`table ${table} does not exist (call HTTP PUT "/sql/schema" to create table schemas)`);
  }

  // append values to buffer (used for in-memory Clickhouse DB batching)
  if ( !buffer.has(table) ) {
    buffer.set(table, [values]);
  } else {
    buffer.get(table)?.push(values);
  }
}

function handleEntityChanges(entityChanges: EntityChange[], metadata: Metadata) {
  for (const change of entityChanges) {
    const values = getValuesInEntityChange(change);
    const id = change.id; // primary key
    insertEntityChange(change.entity, values, change.operation, { ...metadata, id });
  }
}

function handleDatabaseChanges(tableChanges: TableChange[], metadata: Metadata) {
  for (const change of tableChanges) {
    const values = getValuesInTableChange(change);
    const id = ""; // database changes do not have a primary key
    insertEntityChange(change.table, values, change.operation, { ...metadata, id });
  }
}

function insertEntityChange(
  table: string,
  values: Record<string, unknown>,
  operation: EntityChange["operation"] | TableChange["operation"],
  metadata: { id: string; clock: Clock; manifest: Manifest; cursor: string }
) {
  values["id"] = metadata.id; // Entity ID
  values["block_id"] = metadata.clock.id; // Block Index
  values["chain"] = metadata.manifest.chain;
  values["block_number"] = metadata.clock.number; // Block Number
  values["module_hash"] = metadata.manifest.moduleHash;
  values["timestamp"] = Number(new Date(metadata.clock.timestamp)); // Block timestamp
  values["operation"] = operation;
  insertToBuffer(table, values);
  entities++;

  // log
  prometheus.entity_changes.inc({
    chain: metadata.manifest.chain,
    module_hash: metadata.manifest.moduleHash,
    operation,
  });
}

function timeout(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}