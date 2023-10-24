import { FieldKeys } from "../graphql-datatypes.js";
import { TableBuilder } from "./table-builder.js";

export class ClickhouseTableBuilder extends TableBuilder {
  private readonly dictionnary: Record<FieldKeys, string> = {
    BYTES: "String",
    BIGDECIMAL: "String",
    BIGINT: "String",
    BOOLEAN: "boolean",
    STRING: "String",
    FLOAT: "Float64",
    ID: "String",
    INT: "Int32",
  };

  fieldDictionnary(): Record<FieldKeys, string> {
    return this.dictionnary;
  }

  build(): string {
    if (!this.name) {
      throw new Error("Expected a table name, found none.");
    }

    return `CREATE TABLE IF NOT EXISTS ${this.name} (
        ${this.fields.join(",\n")}
    )
    ENGINE = MergeTree
    ORDER BY (${this.primaryKeys.join(", ")})`;
  }
}
