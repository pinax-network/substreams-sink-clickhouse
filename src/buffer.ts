import fs from "fs";
import { client } from "./clickhouse/createClient.js";
import { logger } from "./logger.js";
import * as store from "./clickhouse/stores.js";

export type Values = Record<string, unknown>;
export type Buffer = Map<string, Values[]>;

const path = "buffer.txt";
const encoding = "utf-8";
const highWaterMark = 1024 * 1024; // 1MB

// create a Bun writer to incementally write to the buffer file
// https://bun.sh/guides/write-file/filesink
let writer = Bun.file(path).writer({ highWaterMark }); // 1MB
export let inserts = 0;

export function bulkInsert(rows: {table: string, values: Values}[]) {
  return Promise.all(rows.map(({table, values}) => insert(table, values)));
}

export async function insert(table: string, values: Values): Promise<void> {
  store.check_table(table);
  writer.write(JSON.stringify({table, values}) + "\n");
  await writer.flush();
}

export async function read(): Promise<Buffer> {
  const buffer: Buffer = new Map();
  if ( !fs.existsSync(path) ) return buffer;
  const file = Bun.file(path)
  const text = await file.text();
  const lines = text.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
  for ( const line of lines ) {
    const {table, values} = JSON.parse(line);
    if (buffer.has(table)) {
      buffer.get(table)?.push(values);
    } else {
      buffer.set(table, [values]);
    }
  }
  return buffer;
}

export async function flush(verbose = false): Promise<void> {
  if ( !fs.existsSync(path) ) return; // nothing to flush
  const buffer = await read();
  for ( const [table, values] of buffer.entries() ) {
      await client.insert({table, values, format: "JSONEachRow"})
      if ( verbose ) logger.info('[buffer::flush]', `\tinserted ${values.length} rows into ${table}`);
      inserts++;
  }
  // erase the buffer and overwrite existing writer in "write" mode
  await writer.end();
  fs.rmSync(path);
  writer = Bun.file(path).writer({ highWaterMark });
}

export function count(buffer: Buffer) {
  let count = 0
  for ( const value of buffer.values() ) {
    count += value.length;
  };
  return count;
}

