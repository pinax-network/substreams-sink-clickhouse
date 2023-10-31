import { CORS_HEADERS } from "./cors.js";

export default async function (req: Request) {
  return new Response("Departed", { headers: CORS_HEADERS });
}
