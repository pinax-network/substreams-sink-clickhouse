import { EntityChange } from "@substreams/sink-entity-changes/zod";
import PQueue from "p-queue";
import { client, config } from "../config.js";
import { getValuesInEntityChange } from "../entity-changes.js";
import { logger } from "../logger.js";
import * as prometheus from "../prometheus.js";
import { Clock, Manifest, PayloadBody } from "../schemas.js";
const { setTimeout } = require("timers/promises");

// TO-DO: moves these to a separate file `src/clickhouse/stores.ts`
const knownModuleHashes = new Set<string>();
const knownBlockId = new Set<string>();
const knownBlockIdFinal = new Set<string>();
const knownTables = new Map<string, boolean>();
const queue = new PQueue({ concurrency: config.queueConcurrency });

export async function handleSinkRequest({ data, ...metadata }: PayloadBody) {
  const { manifest, clock } = metadata;
  // Indexes
  handleModuleHashes(queue, manifest);
  handleBlocks(queue, manifest, clock);
  handleFinalBlocks(queue, manifest, clock);

  // EntityChanges
  for (const change of data.entityChanges) {
    handleEntityChange(queue, change, metadata);
  }

  // Prevent queue from growing too large
  prometheus.queue_size.set(queue.size);
  if (queue.size > config.queueLimit) await setTimeout(1000);

  logger.info(`handleSinkRequest | entityChanges=${data.entityChanges.length},queue.size=${queue.size}`);
  return new Response("OK");
}

// Module Hashes index
function handleModuleHashes(queue: PQueue, manifest: Manifest) {
  const { moduleHash, type, moduleName, chain } = manifest;
  if (!knownModuleHashes.has(moduleHash)) {
    queue.add(() =>
      client.insert({
        values: {
          module_hash: moduleHash,
          chain,
          type,
          module_name: moduleName,
        },
        table: "module_hashes",
        format: "JSONEachRow",
      })
    );
    knownModuleHashes.add(moduleHash);
  }
}

// Final Block Index
function handleFinalBlocks(queue: PQueue, manifest: Manifest, clock: Clock) {
  const block_id = clock.id;
  const finalBlockOnly = manifest.finalBlockOnly === "true";
  if (!finalBlockOnly) return; // Only insert final blocks

  if (!knownBlockIdFinal.has(block_id)) {
    queue.add(() =>
      client.insert({
        values: { block_id },
        table: "final_blocks",
        format: "JSONEachRow",
      })
    );
    knownBlockIdFinal.add(block_id);
  }
}

// Block Index
function handleBlocks(queue: PQueue, manifest: Manifest, clock: Clock) {
  const block_id = clock.id;
  const block_number = clock.number;
  const timestamp = Number(new Date(clock.timestamp));
  const chain = manifest.chain;

  if (!knownBlockId.has(block_id)) {
    queue.add(() =>
      client.insert({
        values: {
          block_id,
          block_number,
          chain,
          timestamp,
        },
        table: "blocks",
        format: "JSONEachRow",
      })
    );
    knownBlockId.add(block_id);
  }
}

async function handleEntityChange(queue: PQueue, change: EntityChange, metadata: { clock: Clock; manifest: Manifest }) {
  const tableExists = await existsTable(change.entity);

  let values = getValuesInEntityChange(change);
  const jsonData = JSON.stringify(values);
  const table = tableExists ? change.entity : "unparsed_json";
  logger.info(["handleEntityChange", table, change.operation, change.id, jsonData].join(" | "));

  if (!tableExists) {
    values = { raw_data: jsonData, source: change.entity };
  }

  switch (change.operation) {
    case "OPERATION_CREATE":
      return insertEntityChange(queue, table, values, { ...metadata, id: change.id });

    case "OPERATION_UPDATE":
      return updateEntityChange();

    case "OPERATION_DELETE":
      return deleteEntityChange();

    default:
      prometheus.entity_chages_unsupported.inc();
      logger.error("unsupported operation found in entityChanges: " + change.operation.toString());
      return Promise.resolve();
  }
}

function insertEntityChange(queue: PQueue, table: string, values: Record<string, unknown>, metadata: { id: string; clock: Clock; manifest: Manifest }) {
  // EntityChange
  values["id"] = metadata.id; // Entity ID
  values["block_id"] = metadata.clock.id; // Block Index
  values["module_hash"] = metadata.manifest.moduleHash; // ModuleHash Index
  values["chain"] = metadata.manifest.chain; // Chain Index

  prometheus.entity_changes_inserted.inc();
  return queue.add(() => client.insert({ values, table, format: "JSONStringsEachRow" }));
}

// TODO: implement function
function updateEntityChange(): Promise<void> {
  prometheus.entity_changes_updated.inc();
  return Promise.resolve();

  // return client.update();
}

// TODO: implement function
function deleteEntityChange(): Promise<void> {
  prometheus.entity_changes_deleted.inc();
  return Promise.resolve();

  // return client.delete({ values, table: change.entity });
}

// in memory TABLE name cache
// if true => true
// if false => false
// if undefined => check EXISTS if true or false
async function existsTable(table: string) {
  // Return cached value if known (reduces number of EXISTS queries)
  if (knownTables.has(table)) return knownTables.get(table);

  // Check if table EXISTS
  const response = await client.query({
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
