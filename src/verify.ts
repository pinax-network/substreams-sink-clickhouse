import type { Static, TSchema } from "@sinclair/typebox";
import { ValueError } from "@sinclair/typebox/errors";
import { Value } from "@sinclair/typebox/value";
import { timingSafeEqual } from "crypto";
import nacl from "tweetnacl";
import { logger } from "./logger.js";

type ValidatedBody<S extends TSchema> = { success: false } | { success: true; body: Static<S> };

export function authProvider(publicKey: string, authKey: string) {
  const authKeyBuffer = Buffer.from(authKey, "base64");

  return {
    signed: function withSignedRequest<S extends TSchema>(
      schema: S,
      handler: (payload: Static<S>) => Promise<Response>
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

        let isVerified = false;
        try {
          const msg = Buffer.from(timestamp + body);
          isVerified = verify(msg, signature, publicKey);
        } catch {}

        if (!isVerified) {
          return new Response("invalid request signature", { status: 400 });
        }

        const result = parseBody(schema, body);
        if (!result.success) {
          return new Response();
        }

        return handler(result.body);
      };
    },

    authenticated: function withAuthenticatedRequest<S extends TSchema>(
      schema: S,
      handler: (payload: Static<S>) => Promise<Response>
    ) {
      return async (req: Request) => {
        const authorization = req.headers.get("Authorization");
        if (!authorization) {
          return new Response("missing authorization header", { status: 400 });
        }

        try {
          const key = authorization?.replace("Bearer", "").trim();
          if (!timingSafeEqual(Buffer.from(key, "base64"), authKeyBuffer)) {
            return new Response("invalid authorization key", { status: 400 });
          }
        } catch {
          return new Response("invalid authorization key", { status: 400 });
        }

        const body = await req.text();
        if (!body) {
          return new Response("missing body", { status: 400 });
        }

        const result = parseBody(schema, body);
        if (!result.success) {
          return new Response();
        }

        return handler(result.body);
      };
    },
  };
}

function verify(message: Buffer, signature: string, publicKey: string) {
  return nacl.sign.detached.verify(
    message,
    Buffer.from(signature, "hex"),
    Buffer.from(publicKey, "hex")
  );
}

function parseBody<S extends TSchema>(schema: S, bodyStr: string): ValidatedBody<S> {
  const parsedBody = JSON.parse(bodyStr);
  if (Value.Check(schema, parsedBody)) {
    return { success: true, body: parsedBody };
  }

  const errors: ValueError[] = [];
  const errorsIterator = Value.Errors(schema, parsedBody);
  for (const err of errorsIterator) {
    errors.push(err);
  }

  logger.error("The payload did not have the planned structure: ", errors);
  return { success: false };
}
