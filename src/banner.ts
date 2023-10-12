import pkg from "../package.json" assert { type: "json" };

export function banner() {
  const text = `

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

  return text;
}
