import { config } from "../config.js";

const PREFIX = 'Bearer'
const TOKEN_STRINGS = '[A-Za-z0-9._~+/-]+=*'

export function tokenToBase64(token: string): string {
    return Buffer.from(token).toString('base64');
}

// https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/WWW-Authenticate#directives_
// https://github.com/honojs/hono/blob/main/src/middleware/bearer-auth/index.ts
export function validateBearerAuth(request: Request) {
    if ( !config.authKey ) return true;
    const headerToken = request.headers.get('Authorization');

    // No Authorization header
    if ( !headerToken ) {
        return new Response('Unauthorized', {
            status: 401,
            headers: {
                'WWW-Authenticate': `${PREFIX} realm=""`,
            },
        })
    }
    if ( !headerToken ) return false;
    const regexp = new RegExp('^' + PREFIX + ' +(' + TOKEN_STRINGS + ') *$')
    const match = regexp.exec(headerToken)

    // Invalid request
    if ( !match )  {
        return new Response('Bad Request', {
            status: 400,
            headers: {
              'WWW-Authenticate': `${PREFIX} error="invalid_request"`,
            },
        })
    }

    // Invalid Token
    const equal = tokenToBase64(config.authKey) == tokenToBase64(match[1]);
    if (!equal) {
        return new Response('Unauthorized', {
            status: 401,
            headers: {
                'WWW-Authenticate': `${PREFIX} error="invalid_token"`,
            },
        })
    }
}