import { EntityChange } from "@substreams/sink-entity-changes/zod";
import PQueue from "p-queue";
import { client } from "./clickhouse.js";
import { getValuesInEntityChange } from "./entity-changes.js";
import { logger } from "./logger.js";
import { Clock, Manifest, PayloadBody } from "./schemas.js";

const knownModuleHashes = new Set<string>();
const knownBlockId = new Set<string>();
const existingTables = new Map<string, boolean>();

export function makeSinkRequestHandler(concurrency: number, queueLimit: number) {
  const queue = new PQueue({ concurrency });
  queue.on("error", logger.error);

  return async function handleSinkRequest({ data, ...metadata }: PayloadBody) {
    handleManifest(queue, metadata.manifest);
    handleClock(queue, metadata.manifest, metadata.clock);
    for (const change of data.entityChanges) {
      handleEntityChange(queue, change, metadata);
    }

    if (queue.size > queueLimit) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // TO-DO: Logging can be improved
    logger.info(`handleSinkRequest | entityChanges=${data.entityChanges.length},queue.size=${queue.size}`);
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

async function handleEntityChange(
  queue: PQueue,
  change: EntityChange,
  metadata: { clock: Clock; manifest: Manifest }
) {
  const tableExists = await checkForTable(change.entity);

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

async function checkForTable(table: string): Promise<boolean> {
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
