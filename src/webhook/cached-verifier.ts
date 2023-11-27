import nacl from "tweetnacl";
import { logger } from "../logger.js";

export class CachedVerifier {
  private expirationTimes: { [message: string]: number } = {};

  constructor(public knownPublicKeys: string[]) {}

  public verify(signature: string): boolean {
    if (!this.expirationTimes[signature]) {
      this.removedExpired();
      return this.verifyMessage(signature);
    }

    if (this.now() >= this.expirationTimes[signature]) {
      this.removedExpired();
      return false;
    }

    return true;
  }

  private verifyMessage(message: string) {
    try {
      const msg = Buffer.from(message, "base64url");
      const signature = msg.subarray(0, nacl.sign.signatureLength);
      const payloadBuffer = msg.subarray(nacl.sign.signatureLength);
      const payload = JSON.parse(payloadBuffer.toString("utf-8"));

      if (this.now() >= payload.exp) {
        throw new Error("signature has expired");
      }

      const publicKey = this.knownPublicKeys.find((key) => key === payload.id);
      if (!publicKey) {
        throw new Error("unknown public key");
      }

      if (!nacl.sign.detached.verify(payloadBuffer, signature, Buffer.from(publicKey, "hex"))) {
        throw new Error("invalid signature");
      }

      this.expirationTimes[message] = payload.exp;
      return true;
    } catch (err) {
      logger.error(err);
      return false;
    }
  }

  private removedExpired() {
    for (const key of Object.keys(this.expirationTimes)) {
      if (this.now() >= this.expirationTimes[key]) {
        delete this.expirationTimes[key];
      }
    }
  }

  private now() {
    return new Date().getTime();
  }
}
