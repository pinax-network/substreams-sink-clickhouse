import { config } from "../config.js";
import { toText } from "../fetch/cors.js";
import { Err, Ok, Result } from "../result.js";
import { CachedVerifier } from "./cached-verifier.js";

let verifier: CachedVerifier | null = null;

export default async function (req: Request, text: string): Promise<Result<undefined, Response>> {
  const signature = req.headers.get("x-signature-ed25519");

  if (!signature) return Err(toText("missing required signature in headers", 400));
  if (!text) return Err(toText("missing body", 400));

  verifier ??= new CachedVerifier([config.publicKey]);
  const isVerified = verifier.verify(signature);

  if (!isVerified) return Err(toText("invalid request signature", 401));

  return Ok();
}
