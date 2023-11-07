import blocksSQL from "./blocks.sql";
import cursorsSQL from "./cursors.sql";
import entityChangesSQL from "./entity-changes.sql";
import finalBlocksSQL from "./final-blocks.sql";
import moduleHashesSQL from "./module-hashes.sql";

import { file } from "bun";

export const tables = [
  await file(blocksSQL).text(),
  await file(cursorsSQL).text(),
  await file(entityChangesSQL).text(),
  await file(finalBlocksSQL).text(),
  await file(moduleHashesSQL).text(),
];
