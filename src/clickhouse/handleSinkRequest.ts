import { getValuesInTableChange } from "@substreams/sink-database-changes";
import { TableChange } from "@substreams/sink-database-changes/zod";
import { getValuesInEntityChange } from "@substreams/sink-entity-changes";
import { EntityChange } from "@substreams/sink-entity-changes/zod";
import { Clock, Manifest } from "substreams-sink-webhook/schemas";
import * as prometheus from "../prometheus.js";
import { PayloadBody } from "../schemas.js";
import logUpdate from 'log-update';
import { now } from "../utils.js";
import * as buffer from "../buffer.js"

type Metadata = { clock: Clock; manifest: Manifest; cursor: string };

let entities = 0;
let blocks = 0;
let start = now();
let lastUpdate = now();

// TO-DO - use Prometheus metrics as input to this function
function logProgress() {
  const delta = now() - start
  const blockRate = Math.round(blocks / delta);
  const entitiesRate = Math.round(entities / delta);
  const insertsRate = Math.round(buffer.inserts / delta);
  blocks++;
  logUpdate(`[app] blocks=${blocks} [${blockRate}/s] entities=${entities} [${entitiesRate}/s] inserts=${buffer.inserts} [${insertsRate}/s]`);
}

// ~200-500 blocks per second
export async function handleSinkRequest({ data, ...metadata }: PayloadBody) {
  // Different handler if `graph_out` or `db_out` is emitting data.
  // Handles no incoming data as well.
  if ("entityChanges" in data && data.entityChanges.length > 0) {
    await handleEntityChanges(data.entityChanges, metadata);
  } else if ("tableChanges" in data && data.tableChanges.length > 0) {
    await handleDatabaseChanges(data.tableChanges, metadata);
  }

  // insert metadata
  await insertModuleHashes(metadata);
  await insertBlocks(metadata);

  // clear buffer every 1 second
  if ( lastUpdate != now() ) {
    await buffer.flush();
    lastUpdate = now();
  }

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
  return buffer.insert("module_hashes", values);
}

function insertBlocks(metadata: Metadata) {
  const values = {
    chain: metadata.manifest.chain,
    module_hash: metadata.manifest.moduleHash,
    block_number: metadata.clock.number,
    timestamp: Number(new Date(metadata.clock.timestamp)),
    block_id: metadata.clock.id,
  };
  return buffer.insert("blocks", values);
}

function handleEntityChanges(entityChanges: EntityChange[], metadata: Metadata) {
  const rows = [];
  for (const change of entityChanges) {
    const values = getValuesInEntityChange(change);
    const id = change.id; // primary key
    const row = insertEntityChange(change.entity, values, change.operation, { ...metadata, id });
    rows.push(row);
  }
  return buffer.bulkInsert(rows);
}

function handleDatabaseChanges(tableChanges: TableChange[], metadata: Metadata) {
  const rows = [];
  for (const change of tableChanges) {
    const values = getValuesInTableChange(change);
    const id = ""; // database changes do not have a primary key
    const row = insertEntityChange(change.table, values, change.operation, { ...metadata, id });
    rows.push(row);
  }
  return buffer.bulkInsert(rows);
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
  entities++;

  // log
  prometheus.entity_changes.inc({
    chain: metadata.manifest.chain,
    module_hash: metadata.manifest.moduleHash,
    operation,
  });
  return { table, values };
}
