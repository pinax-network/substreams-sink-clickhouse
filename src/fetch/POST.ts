import { handleSinkRequest } from "../clickhouse/handleSinkRequest.js";
import { store } from "../clickhouse/stores.js";
import { logger } from "../logger.js";
import * as prometheus from "../prometheus.js";
import { BodySchema } from "../schemas.js";
import signatureEd25519 from "../webhook/signatureEd25519.js";
import { toText } from "./cors.js";
import hash from "./hash.js";
import { query } from "./query.js";

export default async function (req: Request) {
  const { pathname } = new URL(req.url);

  if (pathname === "/query") return query(req);
  if (pathname === "/hash") return hash(req);

  if (store.paused) {
    return toText("sink is paused", 400);
  }

  // validate Ed25519 signature
  const text = await req.text();
  const signatureResult = await signatureEd25519(req, text);
  if (!signatureResult.success) return signatureResult.error;

  // parse POST body payload
  try {
    prometheus.requests.inc();
    const body = BodySchema.parse(JSON.parse(text));

    if ("message" in body) {
      if (body.message === "PING") return toText("OK");
      return toText("invalid body", 400);
    }

    return handleSinkRequest(body);
  } catch (err) {
    logger.error(err);
    prometheus.request_errors?.inc();
    return toText("invalid request", 400);
  }
}
