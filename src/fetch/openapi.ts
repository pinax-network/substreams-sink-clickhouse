import pkg from "../../package.json" assert { type: "json" };

import { LicenseObject } from "openapi3-ts/oas30";
import { OpenApiBuilder, ResponsesObject, SchemaObject } from "openapi3-ts/oas31";
import { z } from "zod";
import * as ztjs from "zod-to-json-schema";
import { store } from "../clickhouse/stores.js";
import { BodySchema } from "../schemas.js";
import { BlockResponseSchema } from "./blocks.js";

const zodToJsonSchema = (...params: Parameters<(typeof ztjs)["zodToJsonSchema"]>) =>
  ztjs.zodToJsonSchema(...params) as SchemaObject;

const TAGS = {
  USAGE: "Usage",
  MAINTENANCE: "Maintenance",
  QUERIES: "Queries",
  HEALTH: "Health",
  DOCS: "Documentation",
} as const;

const PUT_RESPONSES: ResponsesObject = {
  200: {
    description: "Success",
    content: { "text/plain": { example: "OK", schema: { type: "string" } } },
  },
  400: {
    description: "Bad request",
    content: { "text/plain": { example: "Bad request", schema: { type: "string" } } },
  },
  401: {
    description: "Unauthorized",
    content: { "text/plain": { example: "Unauthorized", schema: { type: "string" } } },
  },
};

const ExecuteSchemaResponse = z.object({ success: z.literal("OK"), schema: z.string() });

export default new OpenApiBuilder()
  .addInfo({
    title: pkg.name,
    version: pkg.version,
    description: pkg.description,
    license: {
      name: pkg.license,
      identifier: pkg.license,
      url: `${pkg.homepage}/blob/main/LICENSE`,
    } as LicenseObject,
  })
  .addExternalDocs({ url: pkg.homepage, description: "Extra documentation" })
  .addSecurityScheme("auth-key", { type: "http", scheme: "bearer" })
  .addPath("/init", {
    put: {
      tags: [TAGS.USAGE],
      summary: "Initialize database & manifest",
      security: [{ "auth-key": [] }],
      responses: PUT_RESPONSES,
    },
  })
  .addPath("/schema/sql", {
    put: {
      tags: [TAGS.USAGE],
      summary: "Initialize the sink according to a SQL schema",
      description:
        "Supports `CREATE TABLE` statements<br/>If an url is passed in, the body will not be executed.",
      security: [{ "auth-key": [] }],
      parameters: [
        { required: false, in: "query", name: "schema-url", schema: { type: "string" } },
      ],
      requestBody: {
        content: {
          "text/plain": {
            schema: { type: "string" },
            example: "CREATE TABLE foo (bar UInt32)\nENGINE = MergeTree\nORDER BY (bar)",
          },
          "application/octet-stream": {
            schema: { type: "string", format: "base64" },
          },
        },
      },
      responses: {
        ...PUT_RESPONSES,
        200: {
          description: "Success",
          content: { "application/json": { schema: zodToJsonSchema(ExecuteSchemaResponse) } },
        },
      },
    },
  })
  .addPath("/schema/graphql", {
    put: {
      tags: [TAGS.USAGE],
      summary: "Initialize the sink according to a GraphQL schema",
      description:
        "Supports TheGraph's `@entity` statements. See https://thegraph.com/docs/en/querying/graphql-api/#entities<br/>If an url is passed in, the body will not be executed.",
      externalDocs: {
        description: "Valid data types",
        url: "https://thegraph.com/docs/en/developing/creating-a-subgraph/#built-in-scalar-types",
      },
      security: [{ "auth-key": [] }],
      parameters: [
        { required: false, in: "query", name: "schema-url", schema: { type: "string" } },
      ],
      requestBody: {
        content: {
          "text/plain": {
            schema: { type: "string" },
            example: "type Foo @entity {\n\tid: ID!\n\tbar: BigInt\n}",
          },
          "application/octet-stream": {
            schema: { type: "string", format: "base64" },
          },
        },
      },
      responses: {
        ...PUT_RESPONSES,
        200: {
          description: "Success",
          content: { "application/json": { schema: zodToJsonSchema(ExecuteSchemaResponse) } },
        },
      },
    },
  })
  .addPath("/webhook", {
    post: {
      tags: [TAGS.USAGE],
      summary: "Entry point for substreams-sink-webhook",
      externalDocs: {
        description: "substreams-sink-webhook",
        url: "https://github.com/pinax-network/substreams-sink-webhook",
      },
      parameters: [
        {
          in: "header",
          name: "x-signature-timestamp",
          content: { "application/json": { schema: { type: "string" } } },
        },
        {
          in: "header",
          name: "x-signature-ed25519",
          content: { "application/json": { schema: { type: "string" } } },
        },
      ],
      requestBody: {
        content: {
          "application/json": { schema: zodToJsonSchema(BodySchema) },
        },
      },
      responses: PUT_RESPONSES,
    },
  })
  .addPath("/hash", {
    post: {
      tags: [TAGS.USAGE],
      summary: "Generate a hash for a specified password",
      requestBody: {
        required: true,
        description: "The password to hash",
        content: { "text/plain": { schema: { type: "string" } } },
      },
      responses: {
        200: { description: "Success", content: { "text/plain": { schema: { type: "string" } } } },
      },
    },
  })
  .addPath("/pause", {
    put: {
      tags: [TAGS.MAINTENANCE],
      security: [{ "auth-key": [] }],
      summary: "Blocks all incoming requests to `/webhook` until unpaused",
      responses: { 200: { description: "Success" } },
    },
  })
  .addPath("/unpause", {
    put: {
      tags: [TAGS.MAINTENANCE],
      security: [{ "auth-key": [] }],
      summary: "Resumes listening to requests on `/webhook`",
      responses: { 200: { description: "Success" } },
    },
  })
  .addPath("/caches", {
    delete: {
      tags: [TAGS.MAINTENANCE],
      security: [{ "auth-key": [] }],
      summary: "Clears table and chain caches",
      responses: { 200: { description: "Success" } },
    },
  })
  .addPath("/cursors/latest", {
    get: {
      tags: [TAGS.QUERIES],
      summary: "Finds the latest cursor for a given chain and table",
      parameters: [
        { name: "chain", in: "query", required: true, schema: { enum: await store.chains } },
        { name: "table", in: "query", required: true, schema: { enum: await store.publicTables } },
      ],
      responses: {
        200: {
          description: "Success",
          content: {
            "application/json": {
              schema: zodToJsonSchema(z.object({ cursor: z.string(), timestamp: z.string() })),
            },
          },
        },
        400: PUT_RESPONSES[400],
      },
    },
  })
  .addPath("/cursors/missing", {
    get: {
      tags: [TAGS.QUERIES],
      summary: "Finds the missing blocks and returns the start and end cursors",
      parameters: [
        { name: "chain", in: "query", required: true, schema: { enum: await store.chains } },
        { name: "table", in: "query", required: true, schema: { enum: await store.publicTables } },
      ],
      responses: {
        200: {
          description: "Success",
          content: {
            "application/json": {
              schema: zodToJsonSchema(
                z.array(
                  z.object({
                    from: z.object({ block: z.number(), cursor: z.string() }),
                    to: z.object({ block: z.number(), cursor: z.string() }),
                  })
                )
              ),
            },
          },
        },
        400: PUT_RESPONSES[400],
      },
    },
  })
  .addPath("/blocks", {
    get: {
      tags: [TAGS.QUERIES],
      summary: "Gives a summary of known blocks, including min, max and unique block numbers",
      responses: {
        200: {
          description: "Block number summary",
          content: {
            "application/json": {
              schema: zodToJsonSchema(BlockResponseSchema),
            },
          },
        },
        500: { description: "Internal server errror" },
      },
    },
  })
  .addPath("/query", {
    post: {
      tags: [TAGS.QUERIES],
      summary: "Execute queries against the database in read-only mode",
      requestBody: {
        content: {
          "text/plain": {
            schema: { type: "string", examples: ["SELECT COUNT() FROM blocks"] },
          },
        },
      },
      responses: { 200: { description: "query result", content: { "application/json": {} } } },
    },
  })
  .addPath("/health", {
    get: {
      tags: [TAGS.HEALTH],
      summary: "Performs health checks and checks if the database is accessible",
      responses: { 200: PUT_RESPONSES[200] },
    },
  })
  .addPath("/metrics", {
    get: {
      tags: [TAGS.HEALTH],
      summary: "Prometheus metrics",
      responses: { 200: { description: "Prometheus metrics" } },
    },
  })
  .addPath("/openapi", {
    get: {
      tags: [TAGS.DOCS],
      summary: "OpenAPI specification",
      responses: {
        200: { description: "OpenAPI specification JSON", content: { "application/json": {} } },
      },
    },
  })
  .getSpecAsJson();
