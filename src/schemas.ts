import z from "zod";

export const boolean = z
  .string()
  .transform((str) => str.toLowerCase() === "true")
  .or(z.boolean());
export const positiveNumber = z.coerce.number().pipe(z.number().positive());
export const oneOrZero = z.coerce.number().pipe(z.literal(0).or(z.literal(1)));

export const ConfigSchema = z.object({
  publicKey: z
    .string()
    .transform((str) => str.split(","))
    .refine((publicKeys) => publicKeys.filter((key) => key.length > 0).length > 0, "No primary key has been set"),
  authKey: z.optional(z.string().transform((str) => str.replaceAll("\\$", "$"))),
  port: positiveNumber,
  verbose: boolean,
  host: z.string(),
  hostname: z.string(),
  database: z.string(),
  username: z.string(),
  password: z.string(),
  asyncInsert: oneOrZero,
  waitForAsyncInsert: oneOrZero,
  maxBufferSize: positiveNumber,
  insertionDelay: positiveNumber,
  allowUnparsed: boolean,
  resume: boolean,
  buffer: z.string(),
});
export type ConfigSchema = z.infer<typeof ConfigSchema>;
export const TableInitSchema = z.string();
export type TableInitSchema = z.infer<typeof TableInitSchema>;
