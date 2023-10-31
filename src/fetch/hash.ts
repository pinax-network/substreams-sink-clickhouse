import { toText } from "./cors.js";

export default async function hash(req: Request): Promise<Response> {
  const password = await req.text();
  const hash = Bun.password.hashSync(password, "argon2id");
  const escapedHash = hash.replaceAll("$", "\\$");
  return toText(escapedHash);
}
