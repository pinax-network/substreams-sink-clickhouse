import { handleSinkRequest } from "../clickhouse/handleSinkRequest.js";
import * as prometheus from "../prometheus.js";
import { BodySchema } from "../schemas.js";
import signatureEd25519 from "../webhook/signatureEd25519.js";

export default async function (req: Request) {
  // validate Ed25519 signature
  const text = await req.text();
  const signatureError = await signatureEd25519(req, text);
  if (signatureError) return signatureError;

  // parse POST body payload
  try {
    prometheus.requests.inc();
    const body = BodySchema.parse(JSON.parse(text));

    if ("message" in body) {
      if (body.message === "PING") return new Response("OK");
      return new Response("invalid body", { status: 400 });
    }

    return handleSinkRequest(body);
  } catch (err) {
    prometheus.request_errors.inc();
    return new Response("invalid request: " + JSON.stringify(err), { status: 400 });
  }
}
