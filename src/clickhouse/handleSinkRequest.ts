import { EntityChange } from "@substreams/sink-entity-changes/zod";
import PQueue from "p-queue";
import { client, config } from "../config.js";
import { getValuesInEntityChange } from "../entity-changes.js";
import { logger } from "../logger.js";
import {
  entity_chages_unsupported,
  entity_changes_deleted,
  entity_changes_inserted,
  entity_changes_updated,
  queue_size,
} from "../prometheus.js";
import { Clock, Manifest, PayloadBody } from "../schemas.js";
const { setTimeout } = require("timers/promises");

const knownModuleHashes = new Set<string>();
const knownBlockId = new Set<string>();
const existingTables = new Map<string, boolean>();
const queue = new PQueue({ concurrency: config.queueConcurrency });

export async function handleSinkRequest({ data, ...metadata }: PayloadBody) {
  handleManifest(queue, metadata.manifest);
  handleClock(queue, metadata.manifest, metadata.clock);
  for (const change of data.entityChanges) {
    handleEntityChange(queue, change, metadata);
  }

  queue_size?.set(queue.size);
  if (queue.size > config.queueLimit) await setTimeout(1000);

  // TO-DO: Logging can be improved
  logger.info(
    `handleSinkRequest | entityChanges=${data.entityChanges.length},queue.size=${queue.size}`
  );
  return new Response("OK");
}

// Manifest index
function handleManifest(queue: PQueue, manifest: Manifest) {
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
        table: "manifest",
        format: "JSONEachRow",
      })
    );
    knownModuleHashes.add(moduleHash);
  }
}

// Block Index
function handleClock(queue: PQueue, manifest: Manifest, clock: Clock) {
  const block_id = clock.id;
  const block_number = clock.number;
  const timestamp = Number(new Date(clock.timestamp));
  const finalBlockOnly = manifest.finalBlockOnly === "true";
  const chain = manifest.chain;
  const block_key = `${block_id}-${finalBlockOnly}`;

  if (!knownBlockId.has(block_key)) {
    queue.add(() =>
      client.insert({
        values: {
          block_id,
          block_number,
          chain,
          timestamp,
          final_block: finalBlockOnly,
        },
        table: "block",
        format: "JSONEachRow",
      })
    );
    knownBlockId.add(block_key);
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

    case "OPERATION_UPDATE":
      return updateEntityChange();

    case "OPERATION_DELETE":
      return deleteEntityChange();

    default:
      entity_chages_unsupported?.inc();
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

  entity_changes_inserted?.inc();
  return queue.add(() => client.insert({ values, table, format: "JSONStringsEachRow" }));
}

// TODO: implement function
function updateEntityChange(): Promise<void> {
  entity_changes_updated?.inc();
  return Promise.resolve();

  // return client.update();
}

// TODO: implement function
function deleteEntityChange(): Promise<void> {
  entity_changes_deleted?.inc();
  return Promise.resolve();

  // return client.delete({ values, table: change.entity });
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
