import { getValuesInEntityChange } from "@substreams/sink-entity-changes";
import { EntityChange } from "@substreams/sink-entity-changes/zod";
import PQueue from "p-queue";
import { config } from "../config.js";
import { logger } from "../logger.js";
import * as prometheus from "../prometheus.js";
import { Clock, Manifest, PayloadBody } from "../schemas.js";
import client from "./createClient.js";

let timeLimitReached = true;
const queue = new PQueue({ concurrency: 2 });

// TO-DO: moves these to a separate file `src/clickhouse/stores.ts`
const knownModuleHashes = new Set<string>();
const knownBlockId = new Set<string>();
const knownBlockIdFinal = new Set<string>();
const knownTables = new Map<string, boolean>();

let insertions: Record<
  "moduleHashes" | "finalBlocks" | "blocks" | "cursors",
  Array<Record<string, unknown>>
> & { entityChanges: Record<string, unknown[]> } = {
  entityChanges: {},
  moduleHashes: [],
  finalBlocks: [],
  cursors: [],
  blocks: [],
};

export async function handleSinkRequest({ data, ...metadata }: PayloadBody) {
  prometheus.sink_requests?.inc();
  const { manifest, clock, cursor } = metadata;
  // Indexes
  handleModuleHashes(manifest);
  handleBlocks(manifest, clock);
  handleFinalBlocks(manifest, clock);
  handleCursors(manifest, clock, cursor);

  // EntityChanges
  for (const change of data.entityChanges) {
    handleEntityChange(change, metadata);
  }

  if (batchSizeLimitReached()) {
    // Wait for the next insertion window
    await queue.onIdle();
  }

  if (timeLimitReached) {
    // If the previous batch is not fully inserted, wait for it to be.
    await queue.onIdle();

    const { moduleHashes, finalBlocks, blocks, cursors, entityChanges } = insertions;
    insertions = {
      entityChanges: {},
      moduleHashes: [],
      finalBlocks: [],
      cursors: [],
      blocks: [],
    };

    // Plan the next insertion in `config.insertionDelay` ms
    timeLimitReached = false;
    queue
      .add(() => new Promise((resolve) => setTimeout(resolve, config.insertionDelay)))
      .then(() => (timeLimitReached = true));

    // Start an async job to insert every record stored in the current batch.
    // This job will be awaited before starting the next batch.
    queue.add(async () => {
      if (moduleHashes.length > 0) {
        await client.insert({
          values: moduleHashes,
          table: "module_hashes",
          format: "JSONEachRow",
        });
      }

      if (finalBlocks.length > 0) {
        await client.insert({
          values: finalBlocks,
          table: "final_blocks",
          format: "JSONEachRow",
        });
      }

      if (blocks.length > 0) {
        await client.insert({ values: blocks, table: "blocks", format: "JSONEachRow" });
      }

      if (cursors.length > 0) {
        await client.insert({
          values: cursors,
          table: "cursors",
          format: "JSONEachRow",
        });
      }

      if (Object.keys(entityChanges).length > 0) {
        for (const [table, values] of Object.entries(entityChanges)) {
          if (values.length > 0) {
            await client.insert({ table, values, format: "JSONStringsEachRow" });
          }
        }
      }
    });
  }

  logger.info(`handleSinkRequest | entityChanges=${data.entityChanges.length}`);
  return new Response("OK");
}

function batchSizeLimitReached() {
  return (
    insertions.moduleHashes.length >= config.maxBufferSize ||
    insertions.finalBlocks.length >= config.maxBufferSize ||
    insertions.blocks.length >= config.maxBufferSize
  );
}

// Module Hashes index
function handleModuleHashes(manifest: Manifest) {
  const { moduleHash, type, moduleName, chain } = manifest;
  const moduleHashKey = `${moduleHash}-${chain}`;

  if (!knownModuleHashes.has(moduleHashKey)) {
    insertions.moduleHashes.push({ module_hash: moduleHash, chain, type, module_name: moduleName });
    knownModuleHashes.add(moduleHashKey);
  }
}

// Final Block Index
function handleFinalBlocks(manifest: Manifest, clock: Clock) {
  const block_id = clock.id;
  const finalBlockOnly = manifest.finalBlockOnly === "true";
  if (!finalBlockOnly) return; // Only insert final blocks

  if (!knownBlockIdFinal.has(block_id)) {
    insertions.finalBlocks.push({ block_id });
    knownBlockIdFinal.add(block_id);
  }
}

// Block Index
function handleBlocks(manifest: Manifest, clock: Clock) {
  const block_id = clock.id;
  const block_number = clock.number;
  const timestamp = Number(new Date(clock.timestamp));
  const chain = manifest.chain;

  if (!knownBlockId.has(block_id)) {
    insertions.blocks.push({ block_id, block_number, chain, timestamp });
    knownBlockId.add(block_id);
  }
}

function handleCursors(manifest: Manifest, clock: Clock, cursor: string) {
  insertions.cursors.push({
    cursor,
    block_id: clock.id,
    chain: manifest.chain,
    module_hash: manifest.moduleHash,
  });
}

async function handleEntityChange(
  change: EntityChange,
  metadata: { clock: Clock; manifest: Manifest }
) {
  const tableExists = await existsTable(change.entity);

  let values = getValuesInEntityChange(change);
  const jsonData = JSON.stringify(values);
  const table = tableExists ? change.entity : "unparsed_json";
  logger.info(["handleEntityChange", table, change.operation, change.id, metadata.clock, metadata.manifest, jsonData].join(" | "));

  if (!tableExists) {
    values = { raw_data: jsonData, source: change.entity };
  }

  switch (change.operation) {
    case "OPERATION_CREATE":
      return insertEntityChange(table, values, { ...metadata, id: change.id });

    case "OPERATION_UPDATE":
      return updateEntityChange();

    case "OPERATION_DELETE":
      return deleteEntityChange();

    default:
      prometheus.entity_changes_unsupported.inc();
      logger.error("unsupported operation found in entityChanges: " + change.operation.toString());
      return Promise.resolve();
  }
}

function insertEntityChange(
  table: string,
  values: Record<string, unknown>,
  metadata: { id: string; clock: Clock; manifest: Manifest }
) {
  // EntityChange
  values["id"] = metadata.id; // Entity ID
  values["block_id"] = metadata.clock.id; // Block Index
  values["module_hash"] = metadata.manifest.moduleHash; // ModuleHash Index
  values["chain"] = metadata.manifest.chain; // Chain Index

  prometheus.entity_changes_inserted.inc();
  insertions.entityChanges[table] ??= [];
  insertions.entityChanges[table].push(values);
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
