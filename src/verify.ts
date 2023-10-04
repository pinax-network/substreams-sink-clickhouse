import type { Static, TSchema } from "@sinclair/typebox";
import { ValueError } from "@sinclair/typebox/errors";
import { Value } from "@sinclair/typebox/value";
import nacl from "tweetnacl";
import config from "./config.js";
import type { Awaitable } from "./types.js";

type ValidatedBody<S extends TSchema> =
  | { success: false; errors: ValueError[] }
  | { success: true; body: Static<S> };

export function withValidatedRequest<S extends TSchema>(
  schema: S,
  handler: (payload: ValidatedBody<S>) => Awaitable<Response>
) {
  return async (req: Request) => {
    const timestamp = req.headers.get("x-signature-timestamp");
    const signature = req.headers.get("x-signature-ed25519");
    const body = await req.text();

    if (!timestamp) {
      return new Response("missing required timestamp in headers", {
        status: 400,
      });
    }
    if (!signature) {
      return new Response("missing required signature in headers", {
        status: 400,
      });
    }
    if (!body) {
      return new Response("missing body", { status: 400 });
    }

    const msg = Buffer.from(timestamp + body);
    const isVerified = verify(msg, signature, config.PUBLIC_KEY);
    if (!isVerified) {
      return new Response("invalid request signature", { status: 400 });
    }

    const parsedBody = JSON.parse(body);
    const isValid = Value.Check(schema, parsedBody);
    if (isValid) {
      return handler({ success: true, body: parsedBody });
    }

    const errors: ValueError[] = [];
    const errorsIterator = Value.Errors(schema, parsedBody);
    for (const err of errorsIterator) {
      errors.push(err);
    }

    return handler({ success: false, errors });
  };
}

function verify(msg: Buffer, sig: string, publicKey: string) {
  return nacl.sign.detached.verify(
    msg,
    Buffer.from(sig, "hex"),
    Buffer.from(publicKey, "hex")
  );
}
