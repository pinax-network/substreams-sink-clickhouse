// https://bun.sh/guides/util/hash-a-password
import { config } from "../config.js";
import { InvalidRequest, NoAuthorization, Unauthorized, getBearer } from "./bearer.js";

export function beforeHandle(request: Request): Response | undefined {
  if (!config.authKey) return;

  const password = getBearer(request);
  if (!password) return NoAuthorization;

  try {
    if (!Bun.password.verifySync(password, config.authKey)) {
      return Unauthorized;
    }
  } catch {
    return InvalidRequest;
  }
}
