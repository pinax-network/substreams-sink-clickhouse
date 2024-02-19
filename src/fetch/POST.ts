import { handleSinkRequest } from "../clickhouse/handleSinkRequest.js";
import * as store from "../clickhouse/stores.js";
import { publicKeys } from "../config.js";
import { logger } from "../logger.js";
import * as prometheus from "../prometheus.js";
import { BodySchema } from "../schemas.js";
import { signatureEd25519 } from "../webhook/signatureEd25519.js";
import { toText } from "./cors.js";

export default async function (req: Request) {
  if (store.paused) {
    return toText("sink is paused", 500);
  }

  // POST body messagefrom Webhook
  const text = await req.text();

  // validate Ed25519 signature
  // if no public keys are set, skip signature verification
  if ( publicKeys.length ) {
    const signatureResult = await signatureEd25519(req, text, publicKeys);
    if (!signatureResult.success) return signatureResult.error;
  }

  // parse POST body payload
  try {
    prometheus.requests.inc();
    const body = BodySchema.parse(JSON.parse(text));

    if ("message" in body) {
      logger.info('[POST]', text);
      if (body.message === "PING") return toText("OK");
      return toText("invalid body", 400);
    }

    return handleSinkRequest(body);
  } catch (err) {
    logger.error('[POST]', err);
    prometheus.request_errors?.inc();
    return toText("invalid request", 400);
  }
}
