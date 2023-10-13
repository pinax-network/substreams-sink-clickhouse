import { EntityChange } from "@substreams/sink-entity-changes/zod";
import { client } from "./clickhouse.js";
import { getValuesInEntityChange } from "./entity-changes.js";
import { logger } from "./logger.js";
import { Clock, Manifest, PayloadBody } from "./schemas.js";

const knownModuleHashes: string[] = [];

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
      return insertEntityChange(change.entity, values, metadata);

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
  metadata: { clock: Clock; manifest: Manifest }
) {
  if (!knownModuleHashes.includes(metadata.manifest.moduleHash)) {
    await client.command({
      query: `
      INSERT INTO manifest (module_hash, type, module_name)
      VALUES ('${metadata.manifest.moduleHash}', '${metadata.manifest.type}', '${metadata.manifest.moduleName}')`,
    });
    knownModuleHashes.push(metadata.manifest.moduleHash);
  }

  values["chain"] = metadata.manifest.chain;
  values["block_id"] = metadata.clock.id;
  values["block_number"] = metadata.clock.number;
  values["module_hash"] = metadata.manifest.moduleHash;
  values["timestamp"] = new Date(metadata.clock.timestamp).toISOString().slice(0, 19);

  return client.insert({ values, table, format: "JSONEachRow" });
}
