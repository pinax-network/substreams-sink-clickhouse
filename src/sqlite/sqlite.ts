import Database, { Statement } from "bun:sqlite";
import { logger } from "../logger.js";
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
    this.batchNumber = this.initialBatchNumber;

    this.blocksStatement = this.db.prepare(insertions.blocks);
    this.cursorsStatement = this.db.prepare(insertions.cursors);
    this.moduleHashStatement = this.db.prepare(insertions.moduleHashes);
    this.finalBlocksStatement = this.db.prepare(insertions.finalBlocks);
    this.entityChangesStatement = this.db.prepare(insertions.entityChanges);
  }

  public async init() {
    logger.info("Initializing SQLite buffer.");
    for (const table of tables) {
      this.db.query(table).run();
    }
  }

  public insertBlock(blockId: string, blockNumber: number, chain: string, timestamp: number) {
    this.blocksStatement.run([this.batchNumber, blockId, blockNumber, chain, timestamp]);
  }

  public insertCursor(cursor: string, moduleHash: string, blockId: string, blockNumber: number, chain: string) {
    this.cursorsStatement.run([this.batchNumber, cursor, moduleHash, blockId, blockNumber, chain]);
  }

  public insertEntityChanges(data: string, source: string, id: string, blockId: string, moduleHash: string, chain: string) {
    this.entityChangesStatement.run([this.batchNumber, data, source, id, blockId, moduleHash, chain]);
  }

  public insertFinalBlock(blockId: string) {
    this.finalBlocksStatement.run([this.batchNumber, blockId]);
  }

  public insertModuleHash(moduleHash: string, moduleName: string, chain: string, type: string) {
    this.moduleHashStatement.run([this.batchNumber, moduleHash, moduleName, chain, type]);
  }

  private get initialBatchNumber() {
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
        )`
      )
      .get();
    return (response?.batch_number ?? 0) + 1;
  }
}

export const sqlite = new SQLite();
