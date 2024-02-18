# Substreams ClickHouse Sink

> `substreams-sink-clickhouse` is a tool to pipe in data from the blockchain into a [ClickHouse](https://clickhouse.com/) database.

## Table of contents

- [Executable binaries](#executable-binaries)
- [Features](#features)
- [Quickstart](#quickstart)
- [`.env`](#environment)
- [CLI](#cli)

## Executable [binaries](https://github.com/pinax-network/substreams-sink-clickhouse/releases)

See [releases](https://github.com/pinax-network/substreams-sink-clickhouse/releases)

## [Features](/docs/features.md)

See detailed [list of features](/docs/features.md).

- Support for [entity changes](https://crates.io/crates/substreams-entity-change/)
- Support for [database changes](https://crates.io/crates/substreams-database-change)
- Table initialization
  - SQL schemas
  - GraphQL schemas
  - Materialized View
- Automatic block metadata
- Serveless
- [Webhooks](https://github.com/pinax-network/substreams-sink-webhook) Ed25519 signatures
- No data loss

## Quickstart

Every request can also be executed via the [online UI](http://localhost:3000).

1. Associate Webhook Ed25519 public keys from [substreams-sink-webhook](https://github.com/pinax-network/substreams-sink-webhook).

   ```bash
   $ echo "PUBLIC_KEYS=<PK1>,<PK2>,..." >> .env
   ```

1. Start the sink

   ```bash
   $ ./substreams-sink-clickhouse
   ```

1. Initialize the database (_set database credentials in [environment](#environment)_)

   ```bash
   $ ./substream-sink-clickhouse
   $ curl --location 'localhost:3000/health' # --> OK
   $ curl --location --request PUT "localhost:3000/init" # --> OK
   ```

1. Create TABLE for your EntityChanges Substreams (more details on [table initialization](/docs/features.md#table-initialization))

   ```bash
   $ curl --location --request PUT "localhost:3000/schema/sql" \
       --header "Content-Type: text/plain" \
       --data "CREATE TABLE foo () ENGINE=MergeTree ORDER BY();"
   $ # OR
   $ curl --location --request PUT 'localhost:3000/schema/sql?schema-url=<url>'
   ```

## Environment

```bash
$ cp .env.example .env
```

```bash
# ClickHouse DB (optional)
HOST=http://127.0.0.1:8123
USERNAME=default
DATABASE=default
PASSWORD=

# Webhook Ed25519 signature (Optional)
PUBLIC_KEYS=... # ed25519 public key provided by https://github.com/pinax-network/substreams-sink-webhook

# Sink HTTP server (Optional)
PORT=3000
HOSTNAME=0.0.0.0
VERBOSE=true
```

## CLI

Each field in [environment](#environment) can be overriden when starting the sink.

```bash
$ ./substreams-sink-clickhouse --help
```

```
Substreams Clickhouse Sink

Options:
  -V, --version            output the version number
  -v, --verbose <boolean>  Enable verbose logging (choices: "true", "false", default: "true", env: VERBOSE)
  -p, --port <number>      Sink HTTP server port (default: "3000", env: PORT)
  --hostname <string>      Sink HTTP server hostname (default: "0.0.0.0", env: HOSTNAME)
  --public-keys <string>   Webhook Ed25519 public keys (comma separated) (env: PUBLIC_KEYS)
  --host <string>          Clickhouse DB hostname (default: "http://localhost:8123", env: HOST)
  --username <string>      Clickhouse DB username (default: "default", env: USERNAME)
  --password <string>      Clickhouse DB password (default: "", env: PASSWORD)
  --database <string>      Clickhouse DB database (default: "default", env: DATABASE)
  -h, --help               display help for command
```


## Database structure

See [detailed documentation](/docs/database.md)

## Development

```bash
$ bun install
$ bun dev
```
