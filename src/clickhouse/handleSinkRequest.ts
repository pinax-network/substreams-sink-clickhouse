import { getValuesInEntityChange } from "@substreams/sink-entity-changes";
import { EntityChange } from "@substreams/sink-entity-changes/zod";
import PQueue from "p-queue";
import { config } from "../config.js";
import { logger } from "../logger.js";
import * as prometheus from "../prometheus.js";
import { Clock, Manifest, PayloadBody } from "../schemas.js";
import { sqlite } from "../sqlite/sqlite.js";
import client from "./createClient.js";
import { existsTable } from "./store.js";

let bufferedItems = 0;
let timeLimitReached = true;
const queue = new PQueue({ concurrency: 2 });

export async function handleSinkRequest({ data, ...metadata }: PayloadBody) {
  prometheus.sink_requests?.inc();
  const { manifest, clock, cursor } = metadata;

  // Indexes
  bufferedItems++;
  // handleModuleHashes(manifest);
  // handleBlocks(manifest, clock);
  // handleFinalBlocks(manifest, clock);
  // handleCursors(manifest, clock, cursor);

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

    // Plan the next insertion in `config.insertionDelay` ms
    timeLimitReached = false;
    queue
      .add(() => new Promise((resolve) => setTimeout(resolve, config.insertionDelay)))
      .then(() => (timeLimitReached = true));

    // Start an async job to insert every record stored in the current batch.
    // This job will be awaited before starting the next batch.
    queue.add(async () =>
      sqlite.commitBuffer(async (data) => {
        console.log(data.length);

        const blocks = Array(data.length);
        const moduleHashes = Array(data.length);
        const cursors = Array(data.length);
        const entityChanges: Record<string, Array<string>> = {};
        const finalBlocks = [];

        let i = 0;
        for (const record of data) {
          blocks[i] = {
            block_id: record.block_id,
            block_number: record.block_number,
            chain: record.chain,
            timestamp: record.timestamp,
          };
          moduleHashes[i] = {
            module_hash: record.module_hash,
            module_name: record.module_name,
            chain: record.type,
            type: record.type,
          };
          cursors[i] = {
            cursor: record.cursor,
            module_hash: record.module_hash,
            block_id: record.block_id,
            block_number: record.block_number,
            chain: record.chain,
          };

          entityChanges[record.source] ??= [];
          entityChanges[record.source].push(JSON.parse(record.entity_changes));

          if (record.is_final) {
            finalBlocks[i] = { block_id: record.block_id };
          }

          i++;
        }

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
      })
    );
  }

  logger.info(`handleSinkRequest | entityChanges=${data.entityChanges.length}`);
  return new Response("OK");
}

function batchSizeLimitReached() {
  return bufferedItems >= config.maxBufferSize;
}

// // Module Hashes index
// function handleModuleHashes(manifest: Manifest) {
//   const { moduleHash, type, moduleName, chain } = manifest;
//   const moduleHashKey = `${moduleHash}-${chain}`;

//   if (!isKnownModuleHash(moduleHashKey)) {
//     sqlite.insertModuleHash(moduleHash, moduleName, chain, type);
//   }
// }

// // Final Block Index
// function handleFinalBlocks(manifest: Manifest, clock: Clock) {
//   if (manifest.finalBlockOnly) {
//     const block_id = clock.id;
//     sqlite.insertFinalBlock(block_id);
//   }
// }

// // Block Index
// function handleBlocks(manifest: Manifest, clock: Clock) {
//   const block_id = clock.id;
//   const block_number = clock.number;
//   const timestamp = Number(new Date(clock.timestamp));
//   const chain = manifest.chain;

//   sqlite.insertBlock(block_id, block_number, chain, timestamp);
// }

// function handleCursors(manifest: Manifest, clock: Clock, cursor: string) {
//   const { moduleHash, chain } = manifest;
//   const { id: blockId, number: blockNumber } = clock;
//   sqlite.insertCursor(cursor, moduleHash, blockId, blockNumber, chain);
// }

async function handleEntityChange(
  change: EntityChange,
  metadata: { clock: Clock; manifest: Manifest; cursor: string }
) {
  let table = change.entity;
  let values = getValuesInEntityChange(change);
  const tableExists = await existsTable(change.entity);

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

  logger.info(
    ["handleEntityChange", table, change.operation, change.id, clock, manifest, jsonData].join(
      " | "
    )
  );

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
