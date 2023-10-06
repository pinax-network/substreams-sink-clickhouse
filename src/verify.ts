import type { Static, TSchema } from "@sinclair/typebox";
import { ValueError } from "@sinclair/typebox/errors";
import { Value } from "@sinclair/typebox/value";
import nacl from "tweetnacl";

type ValidatedBody<S extends TSchema> =
  | { success: false; errors: ValueError[] }
  | { success: true; body: Static<S> };

export function authProvider(publicKey: string) {
  return {
    validated: function withValidatedRequest<S extends TSchema>(
      schema: S,
      handler: (payload: ValidatedBody<S>) => Promise<Response>
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

        return handler(parseBody(schema, body));
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

function parseBody<S extends TSchema>(
  schema: S,
  bodyStr: string
): ValidatedBody<S> {
  const parsedBody = JSON.parse(bodyStr);
  if (Value.Check(schema, parsedBody)) {
    return { success: true, body: parsedBody };
  }

  const errors: ValueError[] = [];
  const errorsIterator = Value.Errors(schema, parsedBody);
  for (const err of errorsIterator) {
    errors.push(err);
  }

  return { success: false, errors };
}
