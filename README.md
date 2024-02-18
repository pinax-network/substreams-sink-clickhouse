# Substreams ClickHouse Sink

> `substreams-sink-clickhouse` is a tool to pipe in data from the blockchain into a [ClickHouse](https://clickhouse.com/) database.

## Table of contents

- [Executable binaries](#executable-binaries)
- [Features](#features)
- [First steps](#first-steps)
- [CLI](#cli)
- [Environment](#environment)
- [Database structure](#database-structure)
- [Development](#development)

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
- Authentication
  - Basic authentication for users
  - ed25519 signatures for [webhooks](https://github.com/pinax-network/substreams-sink-webhook)
- No data loss

## First steps

Every request can also be executed via the [online UI](http://localhost:3000).

1. Start the sink

   ```bash
   $ ./substreams-sink-clickhouse
   ```

1. Protect the sink with a password

   ```bash
   $ AUTH_KEY=$(curl --location 'localhost:3000/hash' --header 'Content-Type: text/plain' --data '<password>')
   $ echo "AUTH_KEY=$AUTH_KEY" > .env
   ```

1. Associate public keys from [substreams-sink-webhook](https://github.com/pinax-network/substreams-sink-webhook)s

   ```bash
   $ echo "PUBLIC_KEY=<PK1>,<PK2>,..." >> .env
   ```

1. Initialize the database (_set database credentials in [environment](#environment)_)

   ```bash
   $ ./substream-sink-clickhouse
   $ curl --location 'localhost:3000/health' # --> OK
   $ curl --location --request PUT "localhost:3000/init" --header "Authorization: Bearer <password>" # --> OK
   ```

1. Create a table for your substreams (more details on [table initialization](/docs/features.md#table-initialization))

   ```bash
   $ curl --location --request PUT "localhost:3000/schema/sql" \
       --header "Content-Type: text/plain" \
       --header "Authorization: Bearer <password>" \
       --data "CREATE TABLE foo () ENGINE=MergeTree ORDER BY();"
   $ # OR
   $ curl --location --request PUT 'localhost:3000/schema/sql?schema-url=<url>' --header 'Authorization: Bearer <password>'
   ```

## CLI

Each field in [environment](#environment) can be overriden when starting the sink.

```bash
$ ./substreams-sink-clickhouse --help
```

```
Substreams Clickhouse sink module

Options:
  -V, --version                      output the version number
  -p, --port <number>                HTTP port on which to attach the sink (default: "3000", env: PORT)
  -v, --verbose <boolean>            Enable verbose logging (choices: "true", "false", default: "true", env: VERBOSE)
  --hostname <string>                Server listen on HTTP hostname (default: "0.0.0.0", env: HOSTNAME)
  --public-keys <string>             Comma separated list of public keys to validate messages (env: PUBLIC_KEYS)
  --host <string>                    Database HTTP hostname (default: "http://localhost:8123", env: HOST)
  --username <string>                Database user (default: "default", env: USERNAME)
  --password <string>                Password associated with the specified username (default: "", env: PASSWORD)
  --database <string>                The database to use inside ClickHouse (default: "default", env: DATABASE)
  --allow-unparsed <boolean>         Enable storage in 'unparsed_json' table (choices: "true", "false", default: false,
                                     env: ALLOW_UNPARSED)
  -h, --help                         display help for command
```

## Environment

```bash
$ cp .env.example .env
```

```bash
# ClickHouse Database
HOST=http://127.0.0.1:8123
USERNAME=default
DATABASE=default
PASSWORD=

# Webhook Authentication (Optional)
PUBLIC_KEY=... # ed25519 public key provided by https://github.com/pinax-network/substreams-sink-webhook

# HTTP Server (Optional)
PORT=3000
HOSTNAME=0.0.0.0

# Clickhouse Sink Authentication (Optional)
# PUT endpoints are protected (uses HTTP Basic authentication)
AUTH_KEY=...

# Clickhouse Sink (Optional)
MAX_BUFFER_SIZE=1000
INSERTION_DELAY=2000
WAIT_FOR_INSERT=0
ASYNC_INSERT=1
BUFFER=buffer.db
ALLOW_UNPARSED=false
VERBOSE=true
RESUME=true
```

## Database structure

See [detailed documentation](/docs/database.md)

## Development

```bash
$ bun install
$ bun dev
```
