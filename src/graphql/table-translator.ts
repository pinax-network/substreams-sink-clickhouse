import {
  DefinitionNode,
  FieldDefinitionNode,
  Kind,
  TypeNode,
  parse,
} from "graphql/language";
import { TableBuilder } from "./builders/table-builder.js";
import { FieldKeys, graphqlFieldDictionnary } from "./graphql-datatypes.js";

export class TableTranslator {
  private constructor(private builder: TableBuilder) {}

  public static translate(graphql: string, builder: TableBuilder): string[] {
    const ast = parse(graphql, { noLocation: true });

    if (ast.kind !== Kind.DOCUMENT) {
      throw new Error(
        `Invalid schema kind: '${ast.kind}'. Expected '${Kind.DOCUMENT}'`
      );
    }

    const t = new TableTranslator(builder);
    return ast.definitions.map(t.translateDefinitionToTable, t);
  }

  private translateDefinitionToTable(definition: DefinitionNode): string {
    if (definition.kind !== Kind.OBJECT_TYPE_DEFINITION) {
      throw new Error(
        `Invalid definition type: '${definition.kind}'. Expected '${Kind.OBJECT_TYPE_DEFINITION}'`
      );
    }

    if (!definition.fields || definition.fields.length === 0) {
      throw new Error("The specified entity does not contain fields");
    }

    return this.builder
      .clear()
      .addName(definition.name.value)
      .addFields(definition.fields.map(this.translateField, this))
      .addPrimaryKeys(this.findPrimaryKeys(definition))
      .build();
  }

  private translateField(field: FieldDefinitionNode): string {
    return field.name.value + " " + this.translateFieldType(field.type) + " ";
  }

  private translateFieldType(type: TypeNode): string {
    switch (type.kind) {
      case Kind.NAMED_TYPE:
        const fieldType = graphqlFieldDictionnary[type.name.value];
        if (fieldType) {
          return this.builder.fieldDictionnary()[fieldType];
        } else {
          throw new Error(`'${type.name.value}' is not a supported field type`);
        }

      case Kind.NON_NULL_TYPE:
        return this.translateFieldType(type.type) + " NOT NULL ";

      default:
        throw new Error(`${type.kind} translations are not supported`);
    }
  }

  private findPrimaryKeys(definition: DefinitionNode): string[] {
    if (definition.kind !== Kind.OBJECT_TYPE_DEFINITION) {
      return [];
    }

    const identifiers = new Set<string>();
    // This keeps a reference to the name of a field (string) and its
    // type (TypeNode) at this time during the ast's traversal.
    // It allows to detect nested types (non-nullables)
    const valuePairs: Array<[string, TypeNode]> = [];

    for (const field of definition.fields ?? []) {
      valuePairs.push([field.name.value, field.type]);
    }

    while (valuePairs.length > 0) {
      const [name, type] = valuePairs.shift()!;
      if (type.kind === Kind.NAMED_TYPE) {
        if ((type.name.value as FieldKeys) === "ID") {
          identifiers.add(name);
        }
      } else {
        valuePairs.push([name, type.type]);
      }
    }

    return Array.from(identifiers);
  }
}
