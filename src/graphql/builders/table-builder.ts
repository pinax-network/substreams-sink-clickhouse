import { FieldKeys } from "../graphql-datatypes.js";

export type FieldDictionnary = Record<FieldKeys, string>;

export abstract class TableBuilder {
  protected name: string = "";
  protected fields: string[] = [];
  protected primaryKeys: string[] = [];

  abstract fieldDictionnary(): FieldDictionnary;
  abstract build(): string;

  addName(name: string): TableBuilder {
    this.name = name;
    return this;
  }

  addFields(fields: Array<string>): TableBuilder {
    this.fields.push(...fields);
    return this;
  }

  addPrimaryKeys(primaryKeys: Array<string>): TableBuilder {
    this.primaryKeys.push(...primaryKeys);
    return this;
  }

  clear(): TableBuilder {
    this.name = "";
    this.fields = [];
    this.primaryKeys = [];
    return this;
  }
}
