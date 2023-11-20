import { Err, Ok, Result } from "../result.js";
import client from "./createClient.js";

export async function ping(): Promise<Result> {
  try {
    await client.exec({ query: "SELECT 1" });
    return Ok();
  } catch (err) {
    const message = typeof err === "string" ? err : JSON.stringify(err);
    return Err(new Error(message));
  }
}
