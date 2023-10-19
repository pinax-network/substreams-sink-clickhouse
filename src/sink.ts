import { EntityChange } from "@substreams/sink-entity-changes/zod";
import PQueue from "p-queue";
import { client } from "./clickhouse.js";
import { getValuesInEntityChange } from "./entity-changes.js";
import { logger } from "./logger.js";
import { Clock, Manifest, PayloadBody } from "./schemas.js";

const knownModuleHashes = new Set<string>();
const knownBlockId = new Set<string>();

export function makeSinkRequestHandler(concurrency: number, pQueueLimit: number) {
  const queue = new PQueue({ concurrency });
  queue.on("error", logger.error);

  return async function handleSinkRequest({ data, ...metadata }: PayloadBody) {
    handleManifest(queue, metadata.manifest);
    handleClock(queue, metadata.manifest, metadata.clock);
    for (const change of data.entityChanges) {
      handleEntityChange(queue, change, metadata);
    }

    if (queue.size > pQueueLimit) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // TO-DO: Logging can be improved
    logger.info(
      `handleSinkRequest | entityChanges=${data.entityChanges.length},queue.size=${queue.size}`
    );
    return new Response("OK");
  };
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

function handleEntityChange(
  queue: PQueue,
  change: EntityChange,
  metadata: { clock: Clock; manifest: Manifest }
) {
  const values = getValuesInEntityChange(change);
  logger.info(
    "handleEntityChange | " + change.operation + " | " + change.id + " | " + JSON.stringify(values)
  );

  switch (change.operation) {
    case "OPERATION_CREATE":
      return insertEntityChange(queue, change.entity, values, { ...metadata, id: change.id });

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

  return queue.add(() => client.insert({ values, table, format: "JSONEachRow" }));
}
