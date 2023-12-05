export function splitCreateStatement(file: string): Array<string> {
  const prefixes = ["CREATE TABLE", "CREATE MATERIALIZED VIEW", "ALTER TABLE"];
  const prefixRegex = new RegExp(prefixes.map((prefix) => `(${prefix})`).join("|"), "gi");
  const foundPrefixes = (file.match(prefixRegex) ?? []).map((prefix) => prefix.trim());

  return file
    .split(prefixRegex)
    .filter(
      (statement, index) =>
        typeof statement === "string" &&
        statement.trim().length > 0 &&
        !prefixRegex.test(statement) &&
        // The first index will always be either a prefix or useless sql (eg: a comment)
        index !== 0
    )
    .map((statement, index) => foundPrefixes[index] + " " + statement.trim());
}

export function isCreateTableStatement(statement: string): boolean {
  return /CREATE TABLE/gi.test(statement);
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
  if (columns.length === 0) {
    return statement;
  }

  const [createSection] = statement.split("(");
  const body = statement.replace(createSection, "").replace("(", "");

  return `
${createSection.trim()} (
${columns.map((column) => ` ${column}, `).join("\n")}
${body}`;
}
