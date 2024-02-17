import { join } from "path";

function file(path: string) {
  return Bun.file(join(import.meta.dirname, path)).text();
}

const glob = new Bun.Glob("**/*.sql");
const tables: [string, string][] = [];

for (const path of glob.scanSync(import.meta.dirname)) {
  tables.push([path.replace(".sql", ""), await file(path)])
}

export default tables;