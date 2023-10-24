// https://thegraph.com/docs/en/developing/creating-a-subgraph/#graphql-supported-scalars
export const FieldKeys = [
  "BYTES",
  "STRING",
  "BOOLEAN",
  "INT",
  "BIGINT",
  "BIGDECIMAL",
  // These next fields are not present in TheGraph's spec but are in GraphQL's
  "FLOAT",
  "ID",
] as const;
export type FieldKeys = (typeof FieldKeys)[number];

export const graphqlFieldDictionnary: Record<string, FieldKeys> = {
  Bytes: "BYTES",
  String: "STRING",
  Boolean: "BOOLEAN",
  Int: "INT",
  BigInt: "BIGINT",
  BigDecimal: "BIGDECIMAL",
  Float: "FLOAT",
  ID: "ID",
} as const;
