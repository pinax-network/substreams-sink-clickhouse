import { EntityChange } from "@substreams/sink-entity-changes/zod";
import PQueue from "p-queue";
import { config } from "../config.js";
import { getValuesInEntityChange } from "../entity-changes.js";
import { logger } from "../logger.js";
import * as prometheus from "../prometheus.js";
import { Clock, Manifest, PayloadBody } from "../schemas.js";
import client from "./createClient.js";

// TO-DO: moves these to a separate file `src/clickhouse/stores.ts`
const knownModuleHashes = new Set<string>();
const knownBlockId = new Set<string>();
const knownBlockIdFinal = new Set<string>();
const knownTables = new Map<string, boolean>();

let nextUpdateTime: number = 0;
let promises: Array<Promise<unknown>> = [];
let insertions: Record<
  "entityChanges" | "moduleHashes" | "finalBlocks" | "blocks",
  Array<Record<string, unknown>>
> = {
  entityChanges: [],
  moduleHashes: [],
  finalBlocks: [],
  blocks: [],
};

let promise: Promise<unknown> = Promise.resolve();
const queue = new PQueue({ concurrency: 1 });

export async function handleSinkRequest({ data, ...metadata }: PayloadBody) {
  prometheus.sink_requests?.inc();
  const { manifest, clock } = metadata;
  // Indexes
  handleModuleHashes(manifest);
  handleBlocks(manifest, clock);
  handleFinalBlocks(manifest, clock);

  // EntityChanges
  for (const change of data.entityChanges) {
    handleEntityChange(change, metadata);
  }

  if (
    insertions.entityChanges.length > config.maxBufferSize ||
    insertions.moduleHashes.length > config.maxBufferSize ||
    insertions.finalBlocks.length > config.maxBufferSize ||
    insertions.blocks.length > config.maxBufferSize ||
    new Date().getTime() > nextUpdateTime
  ) {
    console.log(
      "------------> ",
      insertions.moduleHashes.length,
      insertions.finalBlocks.length,
      insertions.blocks.length,
      insertions.entityChanges.length,
      promise
    );
    await promise;

    promise = queue.add(async () => {
      if (insertions.moduleHashes.length > 0) {
        await client.insert({
          values: insertions.moduleHashes,
          table: "module_hashes",
          format: "JSONEachRow",
        });
      }
      if (insertions.finalBlocks.length > 0) {
        await client.insert({
          values: insertions.finalBlocks,
          table: "final_blocks",
          format: "JSONEachRow",
        });
      }
      if (insertions.blocks.length > 0) {
        await client.insert({ values: insertions.blocks, table: "blocks", format: "JSONEachRow" });
      }
      if (insertions.entityChanges.length > 0) {
        await client.insert({
          values: insertions.entityChanges,
          table: "Clock",
          format: "JSONStringsEachRow",
        });
      }
    });

    // promise = new Promise((resolve) => queue.on("completed", resolve));

    nextUpdateTime = new Date().getTime() + 2000;
    insertions = {
      entityChanges: [], //Array(insertions.entityChanges.length),
      moduleHashes: [], //Array(insertions.moduleHashes.length),
      finalBlocks: [], //Array(insertions.finalBlocks.length),
      blocks: [], //Array(insertions.blocks.length),
    };
  }

  logger.info(`handleSinkRequest | entityChanges=${data.entityChanges.length}`);
  return new Response("OK");
}

// Module Hashes index
function handleModuleHashes(manifest: Manifest) {
  const { moduleHash, type, moduleName, chain } = manifest;
  if (!knownModuleHashes.has(moduleHash)) {
    // queue.add(() =>
    //   client.insert({
    //   values: {
    //     module_hash: moduleHash,
    //     chain,
    //     type,
    //     module_name: moduleName,
    //   },
    //   table: "module_hashes",
    //   format: "JSONEachRow",
    // })
    // );
    insertions.moduleHashes.push({ module_hash: moduleHash, chain, type, module_name: moduleName });
    knownModuleHashes.add(moduleHash);
  }
}

// Final Block Index
function handleFinalBlocks(manifest: Manifest, clock: Clock) {
  const block_id = clock.id;
  const finalBlockOnly = manifest.finalBlockOnly === "true";
  if (!finalBlockOnly) return; // Only insert final blocks

  if (!knownBlockIdFinal.has(block_id)) {
    // queue.add(() =>
    //   client.insert({
    //     values: { block_id },
    //     table: "final_blocks",
    //     format: "JSONEachRow",
    //   })
    // );
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
    // queue.add(() =>
    //   client.insert({
    //     values: {
    //       block_id,
    //       block_number,
    //       chain,
    //       timestamp,
    //     },
    //     table: "blocks",
    //     format: "JSONEachRow",
    //   })
    // );
    insertions.blocks.push({ block_id, block_number, chain, timestamp });
    knownBlockId.add(block_id);
  }
}

async function handleEntityChange(
  change: EntityChange,
  metadata: { clock: Clock; manifest: Manifest }
) {
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
  // return queue.add(() => client.insert({ values, table, format: "JSONStringsEachRow" }));
  insertions.entityChanges.push(values);
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
