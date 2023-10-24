import { FieldDictionnary, TableBuilder } from "../builders/table-builder.js";

export class MockTableBuilder extends TableBuilder {
  public name = "";
  public fields: string[] = [];
  public primaryKeys: string[] = [];

  fieldDictionnary(): FieldDictionnary {
    return {
      BIGDECIMAL: "big_decimal",
      BIGINT: "big_int",
      BYTES: "bytes",
      BOOLEAN: "bool",
      FLOAT: "float",
      ID: "id",
      INT: "int",
      STRING: "string",
    };
  }

  build(): string {
    return "not implemented";
  }
}
