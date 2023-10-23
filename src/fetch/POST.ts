import { handleSinkRequest } from "../clickhouse/handleSinkRequest.js";
import { sink_request_errors, sink_requests } from "../prometheus.js";
import { BodySchema } from "../schemas.js";
import signatureEd25519 from "../webhook/signatureEd25519.js";

export default async function (req: Request) {
  // validate Ed25519 signature
  const text = await req.text();
  const signatureError = await signatureEd25519(req, text);
  if (signatureError) return signatureError;

  // parse POST body payload
  try {
    const body = BodySchema.parse(JSON.parse(text));

    if ("message" in body) {
      if (body.message === "PING") return new Response("OK");
      return new Response("invalid body", { status: 400 });
    }

    return handleSinkRequest(body);
  } catch {
    sink_request_errors?.inc();
  } finally {
    sink_requests?.inc();
  }
}
