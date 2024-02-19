import blocks from "./blocks.sql";
import module_hashes from "./module_hashes.sql";

export const sqlTables = [
  ["blocks", await Bun.file(blocks).text()],
  ["module_hashes", await Bun.file(module_hashes).text()]
];
