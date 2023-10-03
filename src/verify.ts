import type { Static, TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import nacl from "tweetnacl";
import config from "./config.js";
import type { Awaitable } from "./types.js";

export function withValidatedRequest<S extends TSchema>(
  schema: S,
  handler: (body: Static<S>) => Awaitable<Response>
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
    if (!isValid) {
      return new Response("invalid body", { status: 400 });
    }

    return handler(JSON.parse(body));
  };
}

function verify(msg: Buffer, sig: string, publicKey: string) {
  return nacl.sign.detached.verify(
    msg,
    Buffer.from(sig, "hex"),
    Buffer.from(publicKey, "hex")
  );
}
