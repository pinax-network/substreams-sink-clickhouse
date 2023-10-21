import { BodySchema } from "../schemas.js";
import { config } from "../config.js";
import { verify } from "../webhook/verify.js";
import { handleSinkRequest } from "../clickhouse/handleSinkRequest.js";

export default async function (req: Request) {
    const { pathname} = new URL(req.url);

    if (pathname !== "/" ) return new Response("Not found", { status: 400 });

    const timestamp = req.headers.get("x-signature-timestamp");
    const signature = req.headers.get("x-signature-ed25519");
    const text = await req.text();

    if (!timestamp) return new Response("missing required timestamp in headers", {status: 400});
    if (!signature) return new Response("missing required signature in headers", {status: 400 });
    if (!text) return new Response("missing body", { status: 400 });

    const msg = Buffer.from(timestamp + text);
    const isVerified = verify(msg, signature, config.publicKey);

    if (!isVerified) return new Response("invalid request signature", { status: 400 });

    const body = BodySchema.parse(text);

    if ( "message" in body ) {
        if (body.message === "PING") return new Response("OK");
        return new Response("invalid body", { status: 400 });
    }
    return handleSinkRequest(body)
}
