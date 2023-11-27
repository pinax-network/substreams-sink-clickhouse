import blocks_sql from "./blocks.sql";
import cursors_sql from "./cursors.sql";
import deleted_entity_changes_sql from "./deleted_entity_changes.sql";
import final_blocks_sql from "./final_blocks.sql";
import module_hashes_sql from "./module_hashes.sql";
import unparsed_json_sql from "./unparsed_json.sql";

export const blocks = await Bun.file(blocks_sql).text();
export const final_blocks = await Bun.file(final_blocks_sql).text();
export const module_hashes = await Bun.file(module_hashes_sql).text();
export const unparsed_json = await Bun.file(unparsed_json_sql).text();
export const cursors = await Bun.file(cursors_sql).text();
export const deleted_entity_changes = await Bun.file(deleted_entity_changes_sql).text();

export default [
  ["blocks", blocks],
  ["final_blocks", final_blocks],
  ["module_hashes", module_hashes],
  ["unparsed_json", unparsed_json],
  ["cursors", cursors],
  ["deleted_entity_changes", deleted_entity_changes],
];
