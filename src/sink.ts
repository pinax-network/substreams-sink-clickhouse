import { EntityChange } from "@substreams/sink-entity-changes/zod";
import { client } from "./clickhouse.js";
import { getValuesInEntityChange } from "./entity-changes.js";
import { logger } from "./logger.js";
import { Clock, Manifest, PayloadBody } from "./schemas.js";
import PQueue from 'p-queue';

const knownModuleHashes = new Set<string>();
const knownBlockId = new Set<string>();
const queue = new PQueue({concurrency: 100});

export async function handleSinkRequest({ data, ...metadata }: PayloadBody): Promise<Response> {
  const promises = [];
  promises.push(...handleManifest(metadata.manifest));
  promises.push(...handleClock(metadata.manifest, metadata.clock));
  for ( const change of data.entityChanges ) {
    promises.push(handleEntityChange(change, metadata));
  }

  for ( const promise of promises ) {
    queue.add(async () => {
      try {
        const response = await promise as PromiseRejectedResult;
        if (response.status === "rejected") logger.error("Could not sink data: " + response.reason);
      } catch (e) {
        logger.error("Unknown error: " + e);
      }
    });
  }

  return new Response("OK");
}

// Manifest index
function handleManifest(manifest: Manifest) {
  const promises = [];
  const { moduleHash, type, moduleName, chain } = manifest;
  if (!knownModuleHashes.has(moduleHash)) {
    promises.push(client.insert({ values: {
      module_hash: moduleHash,
      chain,
      type,
      module_name: moduleName,
    }, table: "manifest", format: "JSONEachRow" }));
    knownModuleHashes.add(moduleHash);
  }
  return promises;
}

// Block Index
function handleClock(manifest: Manifest, clock: Clock) {
  const promises = [];
  const block_id = clock.id;
  const block_number = clock.number;
  const timestamp = Number(new Date(clock.timestamp));
  const finalBlockOnly = manifest.finalBlockOnly === "true";
  const chain = manifest.chain;
  const block_key = `${block_id}-${finalBlockOnly}`

  if (!knownBlockId.has(block_key)) {
    promises.push(client.insert({ values: {
      block_id,
      block_number,
      chain,
      timestamp,
      final_block: finalBlockOnly
    }, table: "block", format: "JSONEachRow" }))
    knownBlockId.add(block_key);
  }
  return promises;
}

function handleEntityChange(
  change: EntityChange,
  metadata: { clock: Clock; manifest: Manifest }
): Promise<unknown> {
  const values = getValuesInEntityChange(change);

  switch (change.operation) {
    case "OPERATION_CREATE":
      return insertEntityChange(change.entity, values, { ...metadata, id: change.id });

    // case "OPERATION_UPDATE":
    //   return client.update();

    // case "OPERATION_DELETE":
    //   return client.delete({ values, table: change.entity });

    default:
      logger.error("unsupported operation found in entityChanges: " + change.operation.toString());
      return Promise.resolve();
  }
}

async function insertEntityChange(
  table: string,
  values: Record<string, unknown>,
  metadata: { id: string; clock: Clock; manifest: Manifest }
) {
  // EntityChange
  values["id"] = metadata.id; // Entity ID
  values["block_id"] = metadata.clock.id; // Block Index
  values["module_hash"] = metadata.manifest.moduleHash; // ModuleHash Index
  values["chain"] = metadata.manifest.chain; // Chain Index

  return client.insert({ values, table, format: "JSONEachRow" });
}
