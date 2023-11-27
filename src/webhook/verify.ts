import nacl from "tweetnacl";
import { config } from "../config.js";
import { logger } from "../logger.js";

const expirationTimes = new Map<string, number>();

export function verify(signature: string): boolean {
  if (!expirationTimes.has(signature)) {
    removeExpired();
    return verifyMessage(signature);
  }

  if (new Date().getTime() >= expirationTimes.get(signature)!) {
    removeExpired();
    return false;
  }

  return true;
}

function verifyMessage(message: string) {
  try {
    const msg = Buffer.from(message, "base64url");
    const signature = msg.subarray(0, nacl.sign.signatureLength);
    const payloadBuffer = msg.subarray(nacl.sign.signatureLength);
    const payload = JSON.parse(payloadBuffer.toString("utf-8"));

    if (new Date().getTime() >= payload.exp) {
      throw new Error("signature has expired");
    }

    const publicKey = config.publicKey.find((key) => key === payload.id);
    if (!publicKey) {
      throw new Error("unknown public key");
    }

    if (!nacl.sign.detached.verify(payloadBuffer, signature, Buffer.from(publicKey, "hex"))) {
      throw new Error("invalid signature");
    }

    expirationTimes.set(message, payload.exp);
    return true;
  } catch (err) {
    logger.error(err);
    return false;
  }
}

function removeExpired() {
  const now = new Date().getTime();
  for (const [key, expirationTime] of expirationTimes) {
    if (now >= expirationTime) {
      expirationTimes.delete(key);
    }
  }
}
