import { toText } from "../fetch/cors.js";
import { Err, Ok, Result } from "../result.js";
import { verify } from "./verify.js";

export default async function (req: Request, text: string): Promise<Result<undefined, Response>> {
  const signature = req.headers.get("x-signature-ed25519");

  if (!signature) return Err(toText("missing required signature in headers", 400));
  if (!text) return Err(toText("missing body", 400));

  if (!verify(signature)) {
    return Err(toText("invalid request signature", 401));
  }

  return Ok();
}
