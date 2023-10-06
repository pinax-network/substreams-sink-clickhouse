import { describe, beforeAll, test, expect } from "bun:test";
import { authProvider } from "../verify.js";
import { Type } from "@sinclair/typebox";
import nacl from "tweetnacl";

const EmptySchema = Type.Any();

const secretKey = "3faae992336ea6599fbee55bb2605f1a1297c7288b860725cdfc8794413559dba3cb7366ee8ca77225b4d41772e270e4e831d171d1de71d91707c42e7ba82cc9";
const publicKey = "a3cb7366ee8ca77225b4d41772e270e4e831d171d1de71d91707c42e7ba82cc9";
const invalidPublicKey = "36657c7498f2ff2e9a520dcfbdad4e7c1e5354a75623165e28f6577a45a9eec3";

function signBody(timestamp: string, body: string, secretKey: string) {
  const msg = Buffer.from(timestamp + body);
  const signed = nacl.sign.detached(msg, Buffer.from(secretKey, "hex"));
  return Buffer.from(signed).toString("hex");
}

const validRequest = (bodyObj?: Record<string, unknown>): Request => {
  const init: RequestInit = {};
  const signature = signBody("0", JSON.stringify(bodyObj), secretKey);
  init.headers = { "x-signature-timestamp": "0", "x-signature-ed25519": signature };

  if (bodyObj) {
    init.body = JSON.stringify(bodyObj);
  }

  return new Request("http://localhost", init);
};

const invalidCallback = () => {
  throw new Error("this handler should not have been called.");
};

describe("withValidatedRequest", () => {
  test("it should send an unauthorized code if no signature header is present", async () => {
    const handler = authProvider(publicKey).validated(EmptySchema, invalidCallback);

    const request = validRequest();
    request.headers.delete("x-signature-ed25519");
    const response = await handler(request);

    expect(response.status).toBe(400);
    const responseBody = await response.text();
    expect(responseBody).toBe("missing required signature in headers");
  });

  test("it should send a bad request code if no timestamp header is present", async () => {
    const handler = authProvider(publicKey).validated(EmptySchema, invalidCallback);

    const request = validRequest();
    request.headers.delete("x-signature-timestamp");
    const response = await handler(request);

    expect(response.status).toBe(400);
    const responseBody = await response.text();
    expect(responseBody).toBe("missing required timestamp in headers");
  });

  test("it should send a bad request code if no body is present", async () => {
    const handler = authProvider(publicKey).validated(EmptySchema, invalidCallback);

    const request = validRequest();
    const response = await handler(request);

    expect(response.status).toBe(400);
    const responseBody = await response.text();
    expect(responseBody).toBe("missing body");
  });

  describe("signatures", () => {
    test("it should deny an invalid body signature", async () => {
      const handler = authProvider(invalidPublicKey).validated(Type.Object({ message: Type.String() }), invalidCallback);

      const request = validRequest({ message: "body" });
      const response = await handler(request);

      expect(response.status).toBe(400);
      const responseBody = await response.text();
      expect(responseBody).toBe("invalid request signature");
    });

    test("it should allow a correct body signature", async () => {
      let receivedBody: any;
      const handler = authProvider(publicKey).validated(Type.Object({ message: Type.String() }), async (body) => {
        receivedBody = body;
        return new Response();
      });

      const request = validRequest({ message: "body" });
      const response = await handler(request);

      expect(response.status).toBe(200);
      expect(receivedBody).toEqual({ success: true, body: { message: "body" } });
    });
  });

  test("it should catch invalid body forms", async () => {
    let bodyIsValid = true;
    const handler = authProvider(publicKey).validated(Type.Object({ message: Type.String() }), async (payload) => {
      bodyIsValid = payload.success;
      return new Response();
    });

    const request = validRequest({});
    await handler(request);

    expect(bodyIsValid).toBeFalse();
  });
});
