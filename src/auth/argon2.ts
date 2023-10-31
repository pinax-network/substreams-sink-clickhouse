// https://bun.sh/guides/util/hash-a-password
import { config } from "../config.js";
import { logger } from "../logger.js";
import { InvalidRequest, NoAuthorization, Unauthorized, getBearer } from "./bearer.js";

export function beforeHandle(request: Request) {
  if (!config.authKey) return;

  const bearer = getBearer(request);
  if (!bearer) return NoAuthorization;

  try {
    const verify = Bun.password.verifySync(config.authKey, bearer);
    if (!verify) return Unauthorized;
  } catch (e) {
    logger.error(e);
    return InvalidRequest;
  }
}
