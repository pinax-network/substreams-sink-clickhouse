import { Result } from "../types.js";
import client from "./createClient.js";

export async function ping(): Promise<Result> {
  try {
    await client.exec({ query: "SELECT 1" });
    return { success: true };
  } catch (err) {
    const message = typeof err === "string" ? err : JSON.stringify(err);
    return { success: false, error: new Error(message) };
  }
}
