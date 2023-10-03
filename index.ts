import { Type } from "@sinclair/typebox";
import yaml from "yaml";
import { banner } from "./src/banner.js";
import { client } from "./src/clickhouse.js";
import config from "./src/config.js";
import * as prometheus from "./src/prometheus.js";
import type { Handler } from "./src/types.js";
import { withValidatedRequest } from "./src/verify.js";

const BodySchema = Type.Union([Type.Object({ message: Type.Literal("PING") })]);
const InitSchema = Type.Object({});

const handlers: Record<string, Record<string, Handler>> = {
  GET: {
    "/": () => new Response(banner()),
    "/health": () => new Response("OK"),
    "/metrics": () => new Response(prometheus.registry),
  },
  POST: {
    "/": withValidatedRequest(BodySchema, (body) => {
      if (body.message === "PING") {
        return new Response("OK");
      }

      return new Response("?");
    }),
    "/init": withValidatedRequest(InitSchema, async (body) => {
      try {
        const manifestFile = Bun.file("./substreams.yaml");
        const manifestStr = await manifestFile.text();
        const manifest = yaml.parse(manifestStr);

        const schemaFilename = manifest.sink.config.schema;
        const schemaFile = Bun.file(schemaFilename);
        const schema = await schemaFile.text();

        const result = await client.exec({ query: schema });
        console.log(result);
      } catch (err) {
        return new Response(JSON.stringify(err), { status: 400 });
      }

      return new Response("OK");
    }),
  },
};

const app = Bun.serve({
  port: config.PORT,
  async fetch(request) {
    const { pathname } = new URL(request.url);
    const response = await handlers[request.method]?.[pathname]?.(request);
    return response ?? new Response("Invalid request", { status: 400 });
  },
});

console.log(`Sink listening on port ${app.port}`);
