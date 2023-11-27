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
const clickhouseQueue = new PQueue({ concurrency: 2 });

export async function handleSinkRequest({ data, ...metadata }: PayloadBody) {
  prometheus.sink_requests.inc({
    chain: metadata.manifest.chain,
    module_hash: metadata.manifest.moduleHash,
  });
  bufferedItems++;

  // EntityChanges
  if (data.entityChanges.length > 0) {
    for (const change of data.entityChanges) {
      handleEntityChange(change, metadata);
    }
  } else {
    handleNoEntityChange(metadata);
  }

  if (batchSizeLimitReached()) {
    // Wait for the next insertion window
    await clickhouseQueue.onIdle();
  }

  if (timeLimitReached) {
    // If the previous batch is not fully inserted, wait for it to be.
    await clickhouseQueue.onIdle();
    bufferedItems = 0;

    // Plan the next insertion in `config.insertionDelay` ms
    timeLimitReached = false;
    clickhouseQueue
      .add(() => new Promise((resolve) => setTimeout(resolve, config.insertionDelay)))
      .then(() => (timeLimitReached = true));

    // Start an async job to insert every record stored in the current batch.
    // This job will be awaited before starting the next batch.
    clickhouseQueue.add(saveKnownEntityChanges);
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
        // This check ensures that old stale data coming from SQLite
        // is not inserted after the ClickHouse schema was modified.
        if (await store.existsTable(table)) {
          await client.insert({ table, values, format: "JSONEachRow" });
        } else {
          logger.info(`Skipped (${values.length}) records assigned to table '${table}' because it does not exist.`);
        }
      }
    }
  });
}

function batchSizeLimitReached() {
  return bufferedItems >= config.maxBufferSize;
}

function handleNoEntityChange(metadata: { clock: Clock; manifest: Manifest; cursor: string }) {
  const { clock, manifest, cursor } = metadata;
  sqlite.insert("", "", clock, manifest, cursor);
}

async function handleEntityChange(
  change: EntityChange,
  metadata: { clock: Clock; manifest: Manifest; cursor: string }
) {
  let table = change.entity;
  let values = getValuesInEntityChange(change);
  const tableExists = await store.existsTable(table);

  const jsonData = JSON.stringify(values);
  const clock = JSON.stringify(metadata.clock);
  const manifest = JSON.stringify(metadata.manifest);
  const environment = { chain: metadata.manifest.chain, module_hash: metadata.manifest.moduleHash };

  if (!tableExists) {
    if (!config.allowUnparsed) {
      throw new Error(`could not find table '${table}'. Did you mean to store unparsed data?`);
    }

    values = { raw_data: jsonData, source: table };
    table = "unparsed_json";
  }

  const log = ["handleEntityChange", table, change.operation, change.id, clock, manifest, jsonData];
  logger.info(log.join(" | "));

  switch (change.operation) {
    case "OPERATION_CREATE":
      prometheus.entity_changes_inserted.inc(environment);
      return insertEntityChange(table, values, { ...metadata, id: change.id });

    // Updates are inserted as new rows in ClickHouse. This allows for the full history.
    // If the user wants to override old data, they can specify it in their schema
    // by using a ReplacingMergeTree.
    case "OPERATION_UPDATE":
      prometheus.entity_changes_updated.inc(environment);
      return insertEntityChange(table, values, { ...metadata, id: change.id });

    // Deleted entity changes are not actually removed from the database.
    // They are stored in the 'deleted_entity_changes' table with their timestamp.
    // Again, this allows to keep the full history while also providing the required information
    // to correctly filter out unwanted data if necessary.
    case "OPERATION_DELETE":
      prometheus.entity_changes_deleted.inc(environment);
      return insertEntityChange("deleted_entity_changes", { source: table }, { ...metadata, id: change.id });

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

  sqlite.insert(JSON.stringify(values), table, metadata.clock, metadata.manifest, metadata.cursor);
}
