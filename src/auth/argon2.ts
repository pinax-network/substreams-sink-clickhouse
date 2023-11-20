// https://bun.sh/guides/util/hash-a-password
import { config } from "../config.js";
import { logger } from "../logger.js";
import { Err, Ok, Result } from "../result.js";
import { InvalidAuthRequest, NoAuthorization, Unauthorized, getBearer } from "./bearer.js";

export function beforeHandle(request: Request): Result<undefined, Response> {
  if (!config.authKey) return Ok();

  const password = getBearer(request);
  if (!password) return Err(NoAuthorization);

  try {
    if (!Bun.password.verifySync(password, config.authKey)) {
      return Err(Unauthorized);
    }
  } catch (e) {
    logger.error(e);
    return Err(InvalidAuthRequest);
  }

  return Ok();
}
