import { describe, expect, test } from "bun:test";
import nacl from "tweetnacl";
import z from "zod";
import { authProvider } from "./auth-provider.js";

const EmptySchema = z.any();

const secretKey = "3faae992336ea6599fbee55bb2605f1a1297c7288b860725cdfc8794413559dba3cb7366ee8ca77225b4d41772e270e4e831d171d1de71d91707c42e7ba82cc9";
const publicKey = "a3cb7366ee8ca77225b4d41772e270e4e831d171d1de71d91707c42e7ba82cc9";
const invalidPublicKey = "36657c7498f2ff2e9a520dcfbdad4e7c1e5354a75623165e28f6577a45a9eec3";

function signBody(timestamp: string, body: string, secretKey: string) {
  const msg = Buffer.from(timestamp + body);
  const signed = nacl.sign.detached(msg, Buffer.from(secretKey, "hex"));
  return Buffer.from(signed).toString("hex");
}

const invalidCallback = () => {
  throw new Error("this handler should not have been called.");
};

describe("withSignedRequest", () => {
  const validRequest = (bodyObj?: Record<string, unknown>): Request => {
    const init: RequestInit = {};
    const signature = signBody("0", JSON.stringify(bodyObj), secretKey);
    init.headers = {
      "x-signature-timestamp": "0",
      "x-signature-ed25519": signature,
    };

    if (bodyObj) {
      init.body = JSON.stringify(bodyObj);
    }

    return new Request("http://localhost", init);
  };

  test("it should send a bad request code if no signature header is present", async () => {
    const handler = authProvider({ publicKey }).signed(
      EmptySchema,
      invalidCallback
    );

    const request = validRequest();
    request.headers.delete("x-signature-ed25519");
    const response = await handler(request);

    expect(response.status).toBe(400);
    const responseBody = await response.text();
    expect(responseBody).toBe("missing required signature in headers");
  });

  test("it should send a bad request code if no timestamp header is present", async () => {
    const handler = authProvider({ publicKey }).signed(
      EmptySchema,
      invalidCallback
    );

    const request = validRequest();
    request.headers.delete("x-signature-timestamp");
    const response = await handler(request);

    expect(response.status).toBe(400);
    const responseBody = await response.text();
    expect(responseBody).toBe("missing required timestamp in headers");
  });

  test("it should send a bad request code if no body is present", async () => {
    const handler = authProvider({ publicKey }).signed(
      EmptySchema,
      invalidCallback
    );

    const request = validRequest();
    const response = await handler(request);

    expect(response.status).toBe(400);
    const responseBody = await response.text();
    expect(responseBody).toBe("missing body");
  });

  describe("signatures", () => {
    test("it should deny an invalid body signature", async () => {
      const handler = authProvider({ publicKey: invalidPublicKey }).signed(
        z.object({ message: z.string() }),
        invalidCallback
      );

      const request = validRequest({ message: "body" });
      const response = await handler(request);

      expect(response.status).toBe(400);
      const responseBody = await response.text();
      expect(responseBody).toBe("invalid request signature");
    });

    test("it should allow a correct body signature", async () => {
      let receivedBody: any;
      const handler = authProvider({ publicKey }).signed(
        z.object({ message: z.string() }),
        async (body) => {
          receivedBody = body;
          return new Response();
        }
      );

      const request = validRequest({ message: "body" });
      const response = await handler(request);

      expect(response.status).toBe(200);
      expect(receivedBody).toEqual({ message: "body" });
    });
  });

  test("it should catch invalid body forms", async () => {
    let callbackHasBeenInvoked = false;

    const handler = authProvider({ publicKey }).signed(
      z.object({ message: z.string() }),
      async () => {
        callbackHasBeenInvoked = true;
        return new Response();
      }
    );

    const request = validRequest({});
    await handler(request);

    expect(callbackHasBeenInvoked).toBeFalse();
  });
});

describe("withAuthenticatedRequest", () => {
  test("it should send a bad request code if no authorization header is present", async () => {
    const handler = authProvider({
      publicKey: "key",
      authKey: "1234",
    }).authenticated(z.any(), async () => new Response());

    const request = new Request("http://localhost", {
      body: JSON.stringify({ emptyBody: false }),
    });
    const response = await handler(request);

    expect(response.status).toBe(400);
    const responseBody = await response.text();
    expect(responseBody).toBe("missing authorization header");
  });

  test("it should send a bad request code if the authorization key is invalid", async () => {
    const handler = authProvider({
      publicKey: "key",
      authKey: "5678",
    }).authenticated(z.any(), async () => new Response());

    const request = new Request("http://localhost", {
      body: JSON.stringify({ emptyBody: false }),
      headers: { Authorization: "Bearer 1234" },
    });
    const response = await handler(request);

    expect(response.status).toBe(400);
    const responseBody = await response.text();
    expect(responseBody).toBe("invalid authorization key");
  });

  test("it should send a bad request code if no body is present", async () => {
    const handler = authProvider({
      publicKey: "key",
      authKey: "1234",
    }).authenticated(z.any(), async () => new Response());

    const request = new Request("http://localhost", {
      headers: { Authorization: "Bearer 1234" },
    });
    const response = await handler(request);

    expect(response.status).toBe(400);
    const responseBody = await response.text();
    expect(responseBody).toBe("missing body");
  });

  test("it should validated the payload's structure", async () => {
    let callbackHasBeenInvoked = false;
    const handler = authProvider({
      publicKey: "key",
      authKey: "1234",
    }).authenticated(z.object({ content: z.string() }), async () => {
      callbackHasBeenInvoked = true;
      return new Response();
    });

    const request = new Request("http://localhost", {
      headers: { Authorization: "Bearer 1234" },
      body: JSON.stringify({ emptyBody: false }),
    });
    const response = await handler(request);

    expect(response.status).toBe(200);
    expect(callbackHasBeenInvoked).toBeFalse();
  });

  test("it could call the handler when the authorization key is valid", async () => {
    let callbackHasBeenInvoked = false;
    const handler = authProvider({
      publicKey: "key",
      authKey: "1234",
    }).authenticated(z.any(), async () => {
      callbackHasBeenInvoked = true;
      return new Response();
    });

    const request = new Request("http://localhost", {
      headers: { Authorization: "Bearer 1234" },
      body: JSON.stringify({ emptyBody: false }),
    });
    const response = await handler(request);

    expect(response.status).toBe(200);
    expect(callbackHasBeenInvoked).toBeTrue();
  });

  test("it should skip auth when no key is passed in the configuration", async () => {
    let callbackHasBeenInvoked = false;
    const handler = authProvider({ publicKey }).authenticated(
      z.any(),
      async () => {
        callbackHasBeenInvoked = true;
        return new Response();
      }
    );

    const request = new Request("http://localhost", {
      body: JSON.stringify({ emptyBody: false }),
    });
    const response = await handler(request);

    expect(response.status).toBe(200);
    expect(callbackHasBeenInvoked).toBeTrue();
  });
});
