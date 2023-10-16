import pkg from "../package.json" assert { type: "json" };

import { OpenApiBuilder, SchemaObject } from "openapi3-ts/oas30";
import * as ztjs from "zod-to-json-schema";
import { BodySchema } from "./schemas.js";

const TAGS = {
  MONITORING: "Monitoring",
  HEALTH: "Health",
  USAGE: "Usage",
  DOCS: "Documentation",
} as const;

const zodToJsonSchema = (
  ...params: Parameters<(typeof ztjs)["zodToJsonSchema"]>
) => ztjs.zodToJsonSchema(...params) as SchemaObject;

export default new OpenApiBuilder()
  .addInfo({
    title: pkg.name,
    version: pkg.version,
    description: pkg.description,
  })
  .addExternalDocs({ url: pkg.homepage, description: "Extra documentation" })
  .addSecurityScheme("auth-key", { type: "http", scheme: "bearer" })
  .addPath("/", {
    post: {
      tags: [TAGS.USAGE],
      summary: "Entry point for substreams-sink-webhook",
      externalDocs: {
        description: "substreams-sink-webhook",
        url: "https://github.com/pinax-network/substreams-sink-webhook",
      },
      parameters: [
        { name: "x-signature-timestamp", in: "header" },
        { name: "x-signature-ed25519", in: "header" },
      ],
      requestBody: {
        content: {
          "application/json": { schema: zodToJsonSchema(BodySchema) },
        },
      },
      responses: {
        "200": { description: "OK" },
        "400": { description: "Bad request" },
      },
    },
  })
  .addPath("/ping", {
    get: {
      tags: [TAGS.HEALTH],
      summary: "Checks if the database is accessible",
      responses: {
        "200": { description: "OK" },
        "400": { description: "Could not access the database." },
      },
    },
  })
  .addPath("/health", {
    get: {
      tags: [TAGS.HEALTH],
      summary: "Returns the current process' status",
      responses: { "200": { description: "OK" } },
    },
  })
  .addPath("/metrics", {
    get: {
      tags: [TAGS.MONITORING],
      summary: "Exposes Prometheus metrics",
      responses: {
        "200": {
          description: "The available metrics",
          content: {
            "text/plain": {
              example: `active_connections 0
connected 0
published_messages 0
bytes_published 0
disconnects 0`,
            },
          },
        },
      },
    },
  })
  .addPath("/openapi", {
    get: {
      tags: [TAGS.DOCS],
      summary: "OpenAPI specification",
      responses: { "200": { description: "" } },
    },
  })
  .addPath("/schema", {
    post: {
      tags: [TAGS.USAGE],
      summary: "Initialize the sink according to a SQL schema",
      description: "Supports `CREATE TABLE` statements",
      security: [{ "auth-key": [] }],
      requestBody: {
        content: {
          "text/plain": {
            schema: { type: "string" },
            example:
              "CREATE TABLE foo (bar UInt32) ENGINE = MergeTree ORDER BY (bar)",
          },
          "application/octet-stream": {
            schema: { type: "string", format: "base64" },
          },
        },
      },
      responses: {
        "200": { description: "OK\nProcessed tables: []" },
        "400": { description: "Could not create the tables" },
      },
    },
  })
  .getSpecAsJson();
