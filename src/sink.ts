import { EntityChange } from "@substreams/sink-entity-changes/zod";
import { client } from "./clickhouse.js";
import { getValuesInEntityChange } from "./entity-changes.js";
import { logger } from "./logger.js";
import { Clock, Manifest, PayloadBody } from "./schemas.js";

const knownModuleHashes = new Set<string>();
const knownBlockId = new Set<string>();

export async function handleSinkRequest({ data, ...metadata }: PayloadBody): Promise<Response> {
  const promises = data.entityChanges.map((change) => handleEntityChange(change, metadata));
  const responses = await Promise.allSettled(promises);

  const errors = (
    responses.filter((response) => response.status === "rejected") as PromiseRejectedResult[]
  ).map((response) => response.reason);
  if (errors.length > 0) {
    logger.error("Could not sink data: " + errors.toString());
  }

  return new Response();
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
  const promises = [];

  // Manifest Index
  const { manifest } = metadata;
  const { moduleHash, type, moduleName, chain } = manifest;
  if (!knownModuleHashes.has(moduleHash)) {
    promises.push(client.insert({ values: {
      module_hash: moduleHash,
      chain,
      type,
      module_name: moduleName,
    }, table: "manifest", format: "JSONEachRow" }))
    knownModuleHashes.add(moduleHash);
  }

  // Block Index
  const block_id = metadata.clock.id;
  const block_number = metadata.clock.number;
  const timestamp = Number(new Date(metadata.clock.timestamp));
  const finalBlockOnly = manifest.finalBlockOnly === "true";
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

  // Entity
  values["id"] = metadata.id; // Entity ID
  values["block_id"] = metadata.clock.id; // Block Index
  values["module_hash"] = metadata.manifest.moduleHash; // ModuleHash Index
  values["chain"] = chain;

  promises.push(client.insert({ values, table, format: "JSONEachRow" }));
  return Promise.all(promises);
}
