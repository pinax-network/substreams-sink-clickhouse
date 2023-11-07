import Database from "bun:sqlite";
import { logger } from "../logger.js";
import { tables } from "./tables/index.js";

class SQLite {
  private db: Database;
  private batchNumber = 0;

  public constructor() {
    this.db = new Database("buffer.sqlite");
  }

  public async init() {
    logger.info("Initializing SQLite buffer.");
    for (const table of tables) {
      this.db.query(table).run();
    }
  }
}

export const sqlite = new SQLite();
