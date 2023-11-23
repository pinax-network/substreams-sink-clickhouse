import { Ok, Result, UnknownErr } from "../result.js";
import client from "./createClient.js";

export async function ping(): Promise<Result> {
  try {
    await client.exec({ query: "SELECT 1" });
    return Ok();
  } catch (err) {
    return UnknownErr(err);
  }
}
