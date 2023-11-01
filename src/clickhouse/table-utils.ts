export function splitSchemaByTableCreation(file: string): Array<string> {
  return file
    .split(/(CREATE TABLE)/gi)
    .filter(
      (query, index) =>
        typeof query === "string" &&
        query.trim().length > 0 &&
        query.trim().toUpperCase() !== "CREATE TABLE" &&
        index !== 0 // The first index will always be either 'CREATE TABLE' or useless sql (eg: a comment)
    )
    .map((query) => `CREATE TABLE ${query}`);
}

export function getTableName(schema: string) {
  // Based on the table creation syntax found here:
  // https://clickhouse.com/docs/en/sql-reference/statements/create/table
  return schema
    .replaceAll(/\([\s\S]*\)[\s\S]*/gi, "") // Remove body and everything after
    .replace(/CREATE TABLE/i, "") // Remove 'CREATE TABLE'
    .replace(/IF NOT EXISTS/i, "") // Remove 'IF NOT EXISTS' if it is present
    .replace(/\sON .*/i, "") // Remove 'ON [cluster] if it is present
    .split(".") // The result will be '[db].TableName'
    .reverse()[0] // Keep only the last part: 'TableName'
    .trim();
}

export function augmentCreateTableStatement(statement: string, columns: string[]): string {
  return statement;
}
