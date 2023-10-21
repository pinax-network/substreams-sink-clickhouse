import { client } from "../config.js";

export async function health() {
  try {
    const response = await client.ping();
    if (response.success === false) throw new Error(response.error.message);
    return new Response("OK");
  } catch (e: any) {
    return new Response(e.message, { status: 400 });
  }
}
