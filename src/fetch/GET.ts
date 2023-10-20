import * as prometheus from "../prometheus.js";
import { Server, file } from "bun";
import { handlePingRequest } from "../ping.js";
import openapi from "../openapi.js";

export default async function (req: Request, server: Server) {
    const { pathname} = new URL(req.url);

    if ( pathname === "/" ) return new Response(await file("../swagger/index.html"));
    if ( pathname === "/ping" ) return handlePingRequest({ message: "PING" });
    if ( pathname === "/health" ) return new Response("OK"); // TO-DO: add interactive health check
    if ( pathname === "/metrics" ) return new Response(prometheus.registry);
    if ( pathname === "/openapi" ) return new Response(openapi);

    return new Response("Not found", { status: 400 });
}
