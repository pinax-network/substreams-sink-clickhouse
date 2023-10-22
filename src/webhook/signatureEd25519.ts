import { config } from "../config.js";
import { verify } from "./verify.js";

export default async function (req: Request, text: string) {
    const timestamp = req.headers.get("x-signature-timestamp");
    const signature = req.headers.get("x-signature-ed25519");

    if (!timestamp) return new Response("missing required timestamp in headers", {status: 400});
    if (!signature) return new Response("missing required signature in headers", {status: 400 });
    if (!text) return new Response("missing body", { status: 400 });

    const msg = Buffer.from(timestamp + text);
    const isVerified = verify(msg, signature, config.publicKey);

    if (!isVerified) return new Response("invalid request signature", { status: 401 });
}
