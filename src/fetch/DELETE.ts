import * as argon2 from "../auth/argon2.js";
import { store } from "../clickhouse/stores.js";
import { NotFound } from "./cors.js";

export default async function (req: Request): Promise<Response> {
  const { pathname } = new URL(req.url);

  const authResult = argon2.beforeHandle(req);
  if (!authResult.success) {
    return authResult.error;
  }

  if (pathname === "/caches") {
    store.reset();
    return new Response();
  }

  return NotFound;
}
