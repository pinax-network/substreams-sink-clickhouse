import readline from "readline";
import fs from "fs";
import { client } from "./clickhouse/createClient.js";
import { logger } from "./logger.js";
import * as store from "./clickhouse/stores.js";

export type Values = Record<string, unknown>;
export type Buffer = Map<string, Values[]>;

const path = "buffer.txt";
const encoding = "utf-8";

// create a write stream in "append" mode
let writer = fs.createWriteStream(path, {flags: "a", encoding});
export let inserts = 0;

export function bulkInsert(rows: {table: string, values: Values}[]) {
  return Promise.all(rows.map(({table, values}) => insert(table, values)));
}

export function insert(table: string, values: Values): Promise<void> {
  store.check_table(table);
  return new Promise((resolve, reject) => {
    writer.write(JSON.stringify({table, values}) + "\n", (err) => {
      if (err) return reject(err);
      return resolve();
    });
  });
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
  if ( !fs.existsSync(path) ) {
    writer = fs.createWriteStream(path, {flags: "w", encoding});
    return;
  }
  const buffer = await read();
  for ( const [table, values] of buffer.entries() ) {
      await client.insert({table, values, format: "JSONEachRow"})
      if ( verbose ) logger.info('[buffer::flush]', `\tinserted ${values.length} rows into ${table}`);
      inserts++;
  }
  // clear the buffer and overwrite existing writer in "write" mode
  writer = fs.createWriteStream(path, {flags: "w", encoding});
}

export function count(buffer: Buffer) {
  let count = 0
  for ( const value of buffer.values() ) {
    count += value.length;
  };
  return count;
}

