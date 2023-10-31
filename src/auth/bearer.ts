import { toText } from "../fetch/cors.js";

// https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/WWW-Authenticate#directives_
const TOKEN_STRINGS = "[A-Za-z0-9._~+/-]+=*";
const PREFIX = "Bearer";
const REALM = "sign";

export const NoAuthorization = toText("Unauthorized", 400, new Headers({ "WWW-Authenticate": `${PREFIX} realm="${REALM}"` }));
export const Unauthorized = toText("Unauthorized", 401, new Headers({ "WWW-Authenticate": `${PREFIX} error="invalid_token"` }));
export const InvalidAuthRequest = toText("Bad Request", 400, new Headers({ "WWW-Authenticate": `${PREFIX} error="invalid_request"` }));

export function getBearerToken(headerToken: string) {
  const regexp = new RegExp(`^${PREFIX} (${TOKEN_STRINGS}) *$`);
  const match = regexp.exec(headerToken);
  return match ? match[1] : null;
}

export function getBearer(request: Request) {
  const headerToken = request.headers.get("Authorization");
  return headerToken ? getBearerToken(headerToken) : null;
}
