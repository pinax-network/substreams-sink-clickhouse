import { file } from "bun";
import Database, { Statement } from "bun:sqlite";
import tableSQL from "./table.sql";

type TableFields = {
  batch_number: number;
  entity_changes: string;
  source: string;
  chain: string;
  block_id: string;
  block_number: number;
  is_final: boolean;
  module_hash: string;
  module_name: string;
  type: string;
  timestamp: number;
  cursor: string;
};

const selectSQL = `SELECT * FROM data_buffer WHERE batch_number <= ?;`;
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

  private selectStatement: Statement<TableFields, [number]>;
  private deleteStatement: Statement;
  private insertStatement: Statement;

  public constructor() {
    this.db = new Database("buffer.sqlite");
    this.db.run("PRAGMA synchronous = OFF");
    this.db.run("PRAGMA journal_mode = MEMORY");

    this.db.run(tableSchema);

    this.batchNumber = this.initialBatchNumber;
    this.selectStatement = this.db.prepare(selectSQL);
    this.deleteStatement = this.db.prepare(deleteSQL);
    this.insertStatement = this.db.prepare(insertSQL);
  }

  public insert(entityChanges: string, source: string, chain: string, blockId: string, blockNumber: number, isFinal: boolean, moduleHash: string, moduleName: string, type: string, timestamp: number, cursor: string) {
    this.insertStatement.run(this.batchNumber, entityChanges, source, chain, blockId, blockNumber, isFinal ? 1 : 0, moduleHash, moduleName, type, timestamp, cursor);
  }

  public async commitBuffer(onData: (data: TableFields[]) => Promise<void>) {
    this.batchNumber++;

    const data = this.selectStatement.all(this.batchNumber);
    await onData(data);
    this.deleteStatement.run(this.batchNumber);
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
