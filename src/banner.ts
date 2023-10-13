import { file } from "bun";
import pkg from "../package.json" assert { type: "json" };

/** @ts-expect-error */
import template from "./templates/index.html";

export async function banner() {
  const templateStr = await file(template).text();

  const bannerText = `

░█████╗░██╗░░░░░██╗░█████╗░██╗░░██╗██╗░░██╗░█████╗░██╗░░░██╗░██████╗███████╗
██╔══██╗██║░░░░░██║██╔══██╗██║░██╔╝██║░░██║██╔══██╗██║░░░██║██╔════╝██╔════╝
██║░░╚═╝██║░░░░░██║██║░░╚═╝█████═╝░███████║██║░░██║██║░░░██║╚█████╗░█████╗░░
██║░░██╗██║░░░░░██║██║░░██╗██╔═██╗░██╔══██║██║░░██║██║░░░██║░╚═══██╗██╔══╝░░
╚█████╔╝███████╗██║╚█████╔╝██║░╚██╗██║░░██║╚█████╔╝╚██████╔╝██████╔╝███████╗
░╚════╝░╚══════╝╚═╝░╚════╝░╚═╝░░╚═╝╚═╝░░╚═╝░╚════╝░░╚═════╝░╚═════╝░╚══════╝

                    ${pkg.description} v${pkg.version}
Documentation: ${pkg.homepage}

HTTP GET
    /ping
    /health
    /metrics

HTTP POST (Ed25519 signature)
    / { timestamp, signature, body }
    / { "message": "PING" }

HTTP POST (Authentication key)
    /schema { "schema": <SQL> }
`;

  return templateStr.replace("{BANNER}", bannerText);
}
