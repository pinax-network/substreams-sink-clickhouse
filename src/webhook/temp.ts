import nacl from "tweetnacl";

/////////////////////////////////////////////
// DISCLAIMER
// THIS FILE WILL BE REPLACED BY A NPM IMPORT
/////////////////////////////////////////////

// Keep in memory which signatures are currently valid, and at what time they become invalid.
// This allows to skip the ed25519 validation process each time and only compare the expiration time.
const validSignatures = new Map<string, number>();

export function cachedVerify(...args: Parameters<typeof verify>): ReturnType<typeof verify> {
  const [signature, expiry] = args;

  // Quick return if the signature is already known
  const cachedSignatureExpiry = validSignatures.get(signature);
  if (cachedSignatureExpiry !== undefined) {
    if (isExpired(cachedSignatureExpiry)) {
      return new Error("signature is expired");
    }

    return true;
  }

  // Cleanup expired values from cache
  for (const [signature, expiry] of validSignatures) {
    if (isExpired(expiry)) {
      validSignatures.delete(signature);
    }
  }

  // If it is a new signature, process it normally
  const result = verify(...args);
  validSignatures.set(signature, expiry);
  return result;
}

function isExpired(expirationTime: number): boolean {
  return new Date().getTime() >= expirationTime;
}

export function verify(signature: string, expiry: number, publicKey: string): Error | true {
  if (new Date().getTime() >= expiry) {
    return new Error("signature has expired");
  }

  const payload = JSON.stringify({ exp: expiry, id: publicKey });
  const isVerified = nacl.sign.detached.verify(
    Buffer.from(payload),
    Buffer.from(signature, "hex"),
    Buffer.from(publicKey, "hex")
  );

  if (!isVerified) {
    return new Error("invalid signature");
  }

  return true;
}
