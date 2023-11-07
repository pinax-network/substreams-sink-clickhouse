import Database, { Statement } from "bun:sqlite";
import { tables } from "./tables/index.js";

const insertions = {
  blocks: "INSERT INTO blocks (batch_number, block_id, block_number, chain, timestamp) VALUES (?, ?, ?, ?, ?);",
  cursors: "INSERT INTO cursors (batch_number, cursor, module_hash, block_id, block_number, chain) VALUES (?, ?, ?, ?, ?, ?);",
  moduleHashes: "INSERT INTO module_hashes (batch_number, module_hash, module_name, chain, type) VALUES (?, ?, ?, ?, ?);",
  finalBlocks: "INSERT INTO final_blocks (batch_number, block_id) VALUES (?, ?);",
  entityChanges: "INSERT INTO entity_changes (batch_number, raw_data, source, id, block_id, module_hash, chain) VALUES (?, ?, ?, ?, ?, ?, ?);",
};

class SQLite {
  private db: Database;
  private batchNumber;

  private blocksStatement: Statement;
  private cursorsStatement: Statement;
  private moduleHashStatement: Statement;
  private finalBlocksStatement: Statement;
  private entityChangesStatement: Statement;

  public constructor() {
    this.db = new Database("buffer.sqlite");
    this.db.run("PRAGMA synchronous = OFF");
    this.db.run("PRAGMA journal_mode = MEMORY");
    this.batchNumber = this.initialBatchNumber;

    for (const table of tables) {
      this.db.query(table).run();
    }

    this.blocksStatement = this.db.prepare(insertions.blocks);
    this.cursorsStatement = this.db.prepare(insertions.cursors);
    this.moduleHashStatement = this.db.prepare(insertions.moduleHashes);
    this.finalBlocksStatement = this.db.prepare(insertions.finalBlocks);
    this.entityChangesStatement = this.db.prepare(insertions.entityChanges);
  }

  public start() {
    this.db.run("BEGIN TRANSACTION;");
  }

  public stop() {
    if (this.db.inTransaction) {
      this.db.run("END TRANSACTION;");
    }
  }

  public insertBlock(blockId: string, blockNumber: number, chain: string, timestamp: number) {
    this.blocksStatement.run(this.batchNumber, blockId, blockNumber, chain, timestamp);
  }

  public insertCursor(cursor: string, moduleHash: string, blockId: string, blockNumber: number, chain: string) {
    this.cursorsStatement.run(this.batchNumber, cursor, moduleHash, blockId, blockNumber, chain);
  }

  public insertEntityChanges(data: string, source: string, id: string, blockId: string, moduleHash: string, chain: string) {
    this.entityChangesStatement.run(this.batchNumber, data, source, id, blockId, moduleHash, chain);
  }

  public insertFinalBlock(blockId: string) {
    this.finalBlocksStatement.run(this.batchNumber, blockId);
  }

  public insertModuleHash(moduleHash: string, moduleName: string, chain: string, type: string) {
    this.moduleHashStatement.run(this.batchNumber, moduleHash, moduleName, chain, type);
  }

  public async commitBuffer(onData: (data: Record<string, unknown>) => Promise<void>) {
    this.batchNumber++;

    const blocks = this.db.query("SELECT * FROM blocks WHERE batch_number <= ?").all(this.batchNumber);
    const cursors = this.db.query("SELECT * FROM cursors WHERE batch_number <= ?").all(this.batchNumber);
    const entityChanges = this.db.query("SELECT * FROM entity_changes WHERE batch_number <= ?").all(this.batchNumber);
    const finalBlocks = this.db.query("SELECT * FROM final_blocks WHERE batch_number <= ?").all(this.batchNumber);
    const moduleHashes = this.db.query("SELECT * FROM module_hashes WHERE batch_number <= ?").all(this.batchNumber);

    console.log(blocks.length, cursors.length, entityChanges.length, finalBlocks.length, moduleHashes.length);

    await onData({});

    //  TODO: Delete commited batch :)
    this.db.run("DELETE FROM blocks WHERE batch_number < " + this.batchNumber + ";");
    this.db.run("DELETE FROM cursors WHERE batch_number < " + this.batchNumber + ";");
    this.db.run("DELETE FROM entity_changes WHERE batch_number < " + this.batchNumber + ";");
    this.db.run("DELETE FROM final_blocks WHERE batch_number < " + this.batchNumber + ";");
    this.db.run("DELETE FROM module_hashes WHERE batch_number < " + this.batchNumber + ";");
  }

  private get initialBatchNumber() {
    try {
      const response = this.db
        .query<{ batch_number: number }, any>(
          `SELECT MAX(batch_number) AS batch_number
        FROM (
            SELECT batch_number FROM blocks
            UNION ALL
            SELECT batch_number FROM module_hashes
            UNION ALL
            SELECT batch_number FROM cursors
            UNION ALL
            SELECT batch_number FROM final_blocks
            UNION ALL
            SELECT batch_number FROM entity_changes
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
