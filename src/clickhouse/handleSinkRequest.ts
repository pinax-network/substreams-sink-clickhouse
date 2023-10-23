import { EntityChange } from "@substreams/sink-entity-changes/zod";
import PQueue from "p-queue";
import { getValuesInEntityChange } from "../entity-changes.js";
import { logger } from "../logger.js";
import { Clock, Manifest, PayloadBody } from "../schemas.js";
import { client, config } from "../config.js";
const { setTimeout } = require("timers/promises");

const knownModuleHashes = new Set<string>();
const knownBlockId = new Set<string>();
const knownBlockIdFinal = new Set<string>();
const existingTables = new Map<string, boolean>();
const queue = new PQueue({ concurrency: config.queueConcurrency });

export async function handleSinkRequest({ data, ...metadata }: PayloadBody) {
  const { manifest, clock  } = metadata;
  // Indexes
  handleModuleHashes(queue, manifest);
  handleBlocks(queue, manifest, clock);
  handleFinalBlocks(queue, manifest, clock);

  // EntityChanges
  for (const change of data.entityChanges) {
    handleEntityChange(queue, change, metadata);
  }

  // Prevent queue from growing too large
  if (queue.size > config.queueLimit) await setTimeout(1000);

  logger.info(`handleSinkRequest | entityChanges=${data.entityChanges.length},queue.size=${queue.size}`);
  return new Response("OK");
};

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

async function handleEntityChange(
  queue: PQueue,
  change: EntityChange,
  metadata: { clock: Clock; manifest: Manifest }
) {
  // TO-DO: existsTable needs to be refactored to use `client.query()`
  // Or else should be removed entirely
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

    // case "OPERATION_UPDATE":
    //   return client.update();

    // case "OPERATION_DELETE":
    //   return client.delete({ values, table: change.entity });

    default:
      logger.error("unsupported operation found in entityChanges: " + change.operation.toString());
      return Promise.resolve();
  }
}

function insertEntityChange(
  queue: PQueue,
  table: string,
  values: Record<string, unknown>,
  metadata: { id: string; clock: Clock; manifest: Manifest }
) {
  // EntityChange
  values["id"] = metadata.id; // Entity ID
  values["block_id"] = metadata.clock.id; // Block Index
  values["module_hash"] = metadata.manifest.moduleHash; // ModuleHash Index
  values["chain"] = metadata.manifest.chain; // Chain Index

  return queue.add(() => client.insert({ values, table, format: "JSONStringsEachRow" }));
}

// TO-DO: this function won't work in a serverless function environment or running with multiple replicas
// Cannot depend on memory to know if table exists or not
async function existsTable(table: string) {
  if (!existingTables.has(table)) {
    const response = await client.query({
      query: "EXISTS " + table,
      format: "JSONEachRow",
    });
    const data = await response.json<Array<{ result: 0 | 1 }>>();

    const foundTable = data[0]?.result === 1;
    existingTables.set(table, foundTable);

    logger.info(`Found table '${table}': ${foundTable}. Saving data as json: ${!foundTable}`);
  }
  return existingTables.get(table)!;
}
