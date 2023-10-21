import pkg from "../../package.json" assert { type: "json" };

import { OpenApiBuilder, SchemaObject } from "openapi3-ts/oas31";
import * as ztjs from "zod-to-json-schema";
import { BodySchema } from "../schemas.js";

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
  .addPath("/webhook", {
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
  .addPath("/health", {
    get: {
      tags: [TAGS.HEALTH],
      summary: "Performs health checks and checks if the database is accessible",
      responses: { "200": { description: "OK" } },
    },
  })
  .addPath("/metrics", {
    get: {
      tags: [TAGS.MONITORING],
      summary: "Prometheus metrics",
      responses: {"200": { description: "Prometheus metrics"}},
    },
  })
  .addPath("/openapi", {
    get: {
      tags: [TAGS.DOCS],
      summary: "OpenAPI specification",
      responses: { "200": {description: "OpenAPI JSON Specification" }},
    },
  })
  .addPath("/schema", {
    put: {
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
        "200": { description: "OK" },
        "400": { description: "Bad request" },
        "401": { description: "Unauthorized" },
      },
    },
  })
  .addPath("/init", {
    put: {
      tags: [TAGS.USAGE],
      summary: "Initialize database & manifest",
      security: [{ "auth-key": [] }],
      requestBody: {
        content: {
          "text/plain": {
            schema: { type: "string" },
          },
          "application/octet-stream": {
            schema: { type: "string", format: "base64" },
          },
        },
      },
      responses: {
        "200": { description: "OK" },
        "400": { description: "Bad request" },
        "401": { description: "Unauthorized" },
      },
    },
  })
  .getSpecAsJson();
