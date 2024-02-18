import { join, parse } from "path";
import * as glob from "glob";
import { logger } from "../../src/logger.js";

const pattern = join(import.meta.dirname, "*.sql");

export async function getTables() {
  const tables: [string, string][] = [];
  for (const path of glob.sync(pattern)) {
    tables.push([parse(path).name, await Bun.file(path).text()])
  }
  logger.info("[sql::tables]\t", `Loading ${tables.length} tables from ${pattern}`);
  return tables;
}