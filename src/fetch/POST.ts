import { BodySchema } from "../schemas.js";
import { handleSinkRequest } from "../clickhouse/handleSinkRequest.js";
import signatureEd25519 from "./signatureEd25519.js";

export default async function (req: Request) {
    // validate Ed25519 signature
    const text = await req.text();
    const signatureError = await signatureEd25519(req, text);
    if ( signatureError ) return signatureError;

    // parse POST body payload
    const body = BodySchema.parse(JSON.parse(text));
    if ( "message" in body ) {
        if (body.message === "PING") return new Response("OK");
        return new Response("invalid body", { status: 400 });
    }
    return handleSinkRequest(body);
}
