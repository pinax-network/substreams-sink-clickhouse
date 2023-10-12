import { client } from "./clickhouse.js";
import { logger } from "./logger.js";

export async function handlePingRequest(body: { message: "PING" }) {
  if (body.message === "PING") {
    if (await ping()) {
      return new Response("OK");
    }
    return new Response("ping failed", { status: 400 });
  }
  return new Response("invalid body", { status: 400 });
}

export async function ping(): Promise<boolean> {
  const result = await client.ping();

  if (result.success) {
    logger.info("Ping: OK");
  } else {
    logger.error("Ping: " + result.error);
  }

  return result.success;
}
