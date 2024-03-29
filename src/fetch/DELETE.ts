import * as store from "../clickhouse/stores.js";
import { NotFound } from "./cors.js";

export default async function (req: Request): Promise<Response> {
  const { pathname } = new URL(req.url);

  if (pathname === "/caches") {
    await store.reset("all");
    return new Response();
  }

  return NotFound;
}
