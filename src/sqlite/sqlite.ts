import { file } from "bun";
import Database, { Statement } from "bun:sqlite";
import { config } from "../config.js";
import { Err, Ok, Result } from "../result.js";
import tableSQL from "./table.sql";

const selectSQL = {
  blocks: "SELECT block_id, block_number, chain, timestamp FROM data_buffer WHERE batch_number <= ?;",
  cursors: "SELECT cursor, module_hash, block_id, block_number, chain FROM data_buffer WHERE batch_number <= ?;",
  finalBlocks: "SELECT block_id FROM data_buffer WHERE batch_number <= ? AND is_final = 1;",
  moduleHashes: "SELECT module_hash, module_name, chain, type FROM data_buffer WHERE batch_number <= ?;",
  sources: "SELECT DISTINCT source FROM data_buffer WHERE batch_number <= ?;",
  entityChanges: "SELECT entity_changes FROM data_buffer WHERE batch_number <= ? AND source = ?",
};

const deleteSQL = `DELETE FROM data_buffer WHERE batch_number < ?;`;
const insertSQL = `
INSERT INTO data_buffer (
  batch_number,
  entity_changes, source,
  chain, block_id, block_number, is_final,
  module_hash, module_name, type,
  timestamp, cursor
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`;

const tableSchema = await file(tableSQL).text();

class SQLite {
  private db: Database;
  private batchNumber;

  private selectBlocksStatement: Statement<unknown, [number]>;
  private selectCursorsStatement: Statement<unknown, [number]>;
  private selectFinalBlocksStatement: Statement<unknown, [number]>;
  private selectModuleHashesStatement: Statement<unknown, [number]>;
  private selectSourcesStatement: Statement<{ source: string }, [number]>;
  private selecEntityChangesStatement: Statement<{ entity_changes: string }, [number, string]>;

  private deleteStatement: Statement;
  private insertStatement: Statement;

  public constructor() {
    this.db = new Database(config.buffer);
    this.db.run("PRAGMA synchronous = OFF;");
    this.db.run("PRAGMA journal_mode = MEMORY;");

    this.db.run(tableSchema);
    this.batchNumber = this.initialBatchNumber;

    this.selectBlocksStatement = this.db.prepare(selectSQL.blocks);
    this.selectCursorsStatement = this.db.prepare(selectSQL.cursors);
    this.selectFinalBlocksStatement = this.db.prepare(selectSQL.finalBlocks);
    this.selectModuleHashesStatement = this.db.prepare(selectSQL.moduleHashes);
    this.selectSourcesStatement = this.db.prepare(selectSQL.sources);
    this.selecEntityChangesStatement = this.db.prepare(selectSQL.entityChanges);

    this.deleteStatement = this.db.prepare(deleteSQL);
    this.insertStatement = this.db.prepare(insertSQL);
  }

  public triggerTransaction() {
    if (this.db.inTransaction) {
      this.db.run("END TRANSACTION;");
    }
    this.db.run("BEGIN TRANSACTION;");
  }

  public insert(entityChanges: string, source: string, chain: string, blockId: string, blockNumber: number, isFinal: boolean, moduleHash: string, moduleName: string, type: string, timestamp: number, cursor: string) {
    this.insertStatement.run(this.batchNumber, entityChanges, source, chain, blockId, blockNumber, isFinal ? 1 : 0, moduleHash, moduleName, type, timestamp, cursor);
  }

  public async commitBuffer(onData: (blocks: unknown[], cursors: unknown[], finalBlocks: unknown[], moduleHashes: unknown[], entityChanges: Record<string, unknown[]>) => Promise<void>): Promise<Result> {
    try {
      this.batchNumber++;

      const blocks = this.selectBlocksStatement.all(this.batchNumber);
      const cursors = this.selectCursorsStatement.all(this.batchNumber);
      const finalBlocks = this.selectFinalBlocksStatement.all(this.batchNumber);
      const moduleHashes = this.selectModuleHashesStatement.all(this.batchNumber);
      const entityChanges: Record<string, Array<unknown>> = {};

      const sources = this.selectSourcesStatement.all(this.batchNumber);
      for (const { source } of sources) {
        if (source.length > 0) {
          entityChanges[source] = this.selecEntityChangesStatement.all(this.batchNumber, source).map((response) => JSON.parse(response.entity_changes));
        }
      }

      await onData(blocks, cursors, finalBlocks, moduleHashes, entityChanges);
      this.deleteStatement.run(this.batchNumber);
    } catch (err) {
      if (err instanceof Error) {
        return Err(err);
      } else if (typeof err === "string") {
        return Err(new Error(err));
      } else {
        return Err(new Error(JSON.stringify(err)));
      }
    }

    return Ok();
  }

  private get initialBatchNumber() {
    try {
      const response = this.db
        .query<{ batch_number: number }, any>(
          `SELECT MAX(batch_number) AS batch_number
        FROM (
            SELECT batch_number FROM data_buffer
            UNION ALL
            SELECT 0 AS batch_number
        )`
        )
        .get();
      return response!.batch_number + 1;
    } catch {
      return 0;
    }
  }
}

export const sqlite = new SQLite();
