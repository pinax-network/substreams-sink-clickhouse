import { getValuesInEntityChange } from "@substreams/sink-entity-changes";
import { EntityChange } from "@substreams/sink-entity-changes/zod";
import PQueue from "p-queue";
import { config } from "../config.js";
import { logger } from "../logger.js";
import * as prometheus from "../prometheus.js";
import { Clock, Manifest, PayloadBody } from "../schemas.js";
import { sqlite } from "../sqlite/sqlite.js";
import client from "./createClient.js";
import { store } from "./stores.js";

let bufferedItems = 0;
let timeLimitReached = true;
const queue = new PQueue({ concurrency: 2 });
const insertQueue = new PQueue({ concurrency: 1 });

export async function handleSinkRequest({ data, ...metadata }: PayloadBody) {
  if (bufferedItems % config.transactionSize === 0) {
    sqlite.triggerTransaction();
  }

  prometheus.sink_requests?.inc();
  bufferedItems++;

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
    bufferedItems = 0;

    // Plan the next insertion in `config.insertionDelay` ms
    timeLimitReached = false;
    queue
      .add(() => new Promise((resolve) => setTimeout(resolve, config.insertionDelay)))
      .then(() => (timeLimitReached = true));

    // Start an async job to insert every record stored in the current batch.
    // This job will be awaited before starting the next batch.
    queue.add(saveKnownEntityChanges);
  }

  logger.info(`handleSinkRequest | entityChanges=${data.entityChanges.length}`);
  return new Response("OK");
}

export function saveKnownEntityChanges() {
  return sqlite.commitBuffer(async (blocks, cursors, finalBlocks, moduleHashes, entityChanges) => {
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

    for (const [table, values] of Object.entries(entityChanges)) {
      if (values.length > 0) {
        await client.insert({ table, values, format: "JSONEachRow" });
      }
    }
  });
}

function batchSizeLimitReached() {
  return bufferedItems >= config.maxBufferSize;
}

async function handleEntityChange(
  change: EntityChange,
  metadata: { clock: Clock; manifest: Manifest; cursor: string }
) {
  let table = change.entity;
  let values = getValuesInEntityChange(change);
  const tableExists = await store.existsTable(change.entity);

  const jsonData = JSON.stringify(values);
  const clock = JSON.stringify(metadata.clock);
  const manifest = JSON.stringify(metadata.manifest);

  if (!tableExists) {
    if (!config.allowUnparsed) {
      throw new Error(
        `could not find table '${change.entity}'. Did you mean to store unparsed data?`
      );
    }

    table = "unparsed_json";
    values = { raw_data: jsonData, source: change.entity };
  }

  const log = ["handleEntityChange", table, change.operation, change.id, clock, manifest, jsonData];
  logger.info(log.join(" | "));

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
  metadata: { id: string; clock: Clock; manifest: Manifest; cursor: string }
) {
  values["id"] = metadata.id; // Entity ID
  values["block_id"] = metadata.clock.id; // Block Index
  values["block_number"] = metadata.clock.number; // Block number
  values["module_hash"] = metadata.manifest.moduleHash; // ModuleHash Index
  values["chain"] = metadata.manifest.chain; // Chain Index
  values["timestamp"] = Number(new Date(metadata.clock.timestamp)); // Block timestamp
  values["cursor"] = metadata.cursor; // Block cursor for current substreams

  insertQueue.add(() =>
    sqlite.insert(
      JSON.stringify(values),
      table,
      metadata.manifest.chain,
      metadata.clock.id,
      metadata.clock.number,
      metadata.manifest.finalBlockOnly,
      metadata.manifest.moduleHash,
      metadata.manifest.moduleName,
      metadata.manifest.type,
      Number(new Date(metadata.clock.timestamp)),
      metadata.cursor
    )
  );

  prometheus.entity_changes_inserted.inc();
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
