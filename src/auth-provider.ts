import { timingSafeEqual } from "crypto";
import nacl from "tweetnacl";
import z, { ZodString } from "zod";
import { logger } from "./logger.js";

type ValidatedBody<S extends z.Schema> =
  | { success: false }
  | { success: true; body: z.infer<S> };

export function authProvider(config: {
  publicKey: string | undefined;
  authKey?: string;
}) {
  if (!config.publicKey) {
    throw new Error("No public key was provided.");
  }

  const authKeyBuffer = config.authKey
    ? Buffer.from(config.authKey, "base64")
    : null;

  return {
    signed: function withSignedRequest<S extends z.Schema>(
      schema: S,
      handler: (payload: z.infer<S>) => Promise<Response>
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
          isVerified = verify(msg, signature, config.publicKey!);
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

    authenticated: function withAuthenticatedRequest<S extends z.Schema>(
      schema: S,
      handler: (payload: z.infer<S>) => Promise<Response>
    ) {
      return async (req: Request) => {
        if (authKeyBuffer !== null) {
          const authorization = req.headers.get("Authorization");
          if (!authorization) {
            return new Response("missing authorization header", {
              status: 400,
            });
          }

          try {
            const key = authorization?.replace("Bearer", "").trim();
            if (!timingSafeEqual(Buffer.from(key, "base64"), authKeyBuffer)) {
              return new Response("invalid authorization key", { status: 400 });
            }
          } catch {
            return new Response("invalid authorization key", { status: 400 });
          }
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

function parseBody<S extends z.Schema>(
  schema: S,
  bodyStr: string
): ValidatedBody<S> {
  try {
    const parsedBody =
      schema instanceof ZodString ? bodyStr : JSON.parse(bodyStr);
    const validationResult = schema.safeParse(parsedBody);

    if (validationResult.success) {
      return { success: true, body: validationResult.data };
    }

    logger.error(
      "The payload did not have the planned structure:\n" +
        JSON.stringify(validationResult.error)
    );
    return { success: false };
  } catch (err) {
    logger.error("could not parse the body correctly: " + err);
    return { success: false };
  }
}
