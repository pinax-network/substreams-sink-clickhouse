import { config } from "../config.js";
import { toText } from "../fetch/cors.js";
import { verify } from "./verify.js";

export default async function (req: Request, text: string) {
  const timestamp = req.headers.get("x-signature-timestamp");
  const signature = req.headers.get("x-signature-ed25519");

  if (!timestamp) return toText("missing required timestamp in headers", 400);
  if (!signature) return toText("missing required signature in headers", 400);
  if (!text) return toText("missing body", 400);

  const msg = Buffer.from(timestamp + text);
  const isVerified = verify(msg, signature, config.publicKey);

  if (!isVerified) return toText("invalid request signature", 401);
}
