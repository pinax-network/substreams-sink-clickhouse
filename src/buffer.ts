import readline from "readline";
import fs from "fs";
import { client } from "./clickhouse/createClient.js";
import { logger } from "./logger.js";
import * as store from "./clickhouse/stores.js";

export type Values = Record<string, unknown>;
export type Buffer = Map<string, Values[]>;

const path = "buffer.txt";
const encoding = "utf-16le";
const writer = fs.createWriteStream(path, {flags: "a", encoding});

export let inserts = 0;

export function bulkInsert(rows: {table: string, values: Values}[]) {
  writer.write(rows.map(row => JSON.stringify(row)).join("\n") + "\n");
}

export function insert(table: string, values: Values) {
  store.check_table(table);
  writer.write(JSON.stringify({table, values}) + "\n");
}

export async function read(): Promise<Buffer> {
  const buffer: Buffer = new Map();
  if ( !fs.existsSync(path) ) return buffer;
  const input = fs.createReadStream(path, {encoding});
  const rl = readline.createInterface({ input });

  return new Promise((resolve, reject) => {
    rl.on("line", (line) => {
      const {table, values} = JSON.parse(line);
      if (buffer.has(table)) {
        buffer.get(table)?.push(values);
      } else {
        buffer.set(table, [values]);
      }
    });
    rl.on("close", () => {
      return resolve(buffer);
    });
    rl.on("error", (err) => {
      return reject(err);
    });
  });
}

export async function flush(verbose = false) {
  if ( !fs.existsSync(path) ) return;
  const buffer = await read();
  for ( const [table, values] of buffer.entries() ) {
      await client.insert({table, values, format: "JSONEachRow"})
      if ( verbose ) logger.info('[buffer::flush]', `\tinserted ${values.length} rows into ${table}`);
      buffer.delete(table);
      inserts++;
  }
  // clear the buffer
  fs.createWriteStream(path, {encoding});
}

export function count(buffer: Buffer) {
  let count = 0
  for ( const value of buffer.values() ) {
    count += value.length;
  };
  return count;
}
