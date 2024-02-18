import { readOnlyClient } from "./createClient.js";

export async function ping() {
  const query = "SELECT 1";
  return {query, ... await readOnlyClient.exec({ query })};
}
