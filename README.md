# Substreams ClickHouse Sink CLI

`substreams-sink-clickhouse` is a tool to pipe in data from the blockchain into a ClickHouse database.

## [Pre-built binaries](https://github.com/pinax-network/substreams-sink-clickhouse/releases)

- Linux

## Installation

Globally via npm

```
$ npm i -g substreams-sink-clickhouse
```

### Environment variables

```bash
# ./.env

PUBLIC_KEY=... # Provided by substreams-sink-webhook

DB_HOST=http://127.0.0.1:8123
DB_NAME=clickhouse_sink
DB_USERNAME=default
DB_PASSWORD=

AUTH_KEY=... # Generate in Node via `require(crypto).randomBytes(64).toString('base64')`
```

## Usage

Endpoint summary available at [http://localhost:3000](http://localhost:3000).

```bash
substreams-clickhouse-sink --help
```

### Schema initialization

Initializes the database according to a SQL file. See [example file](#example-sql-file).

It can also be done by uploading a `.sql` file on [http://localhost:3000](http://localhost:3000).

```bash
curl --location --request POST 'http://localhost:3000/schema' --header 'Authorization: Bearer <AUTH_KEY>' --header 'Content-Type: application/json' --data-raw '{"schema": "<SQL_INSTRUCTIONS>"}'
```

### Sink

Serves an endpoint to receive Substreams data from [substreams-sink-webhook](https://github.com/pinax-network/substreams-sink-webhook).

Endpoints are detailed on [http://localhost:3000](http://localhost:3000).

```bash
substreams-clickhouse-sink
# or
bun start
```

#### Optional flags

| Flags             | Description                                            |
| ----------------- | ------------------------------------------------------ |
| `-v`, `--verbose` | Enables logs. Add `"json"` to change the output format |
| `-p`, `--port`    | Selects the port to serve the sink                     |

#### Example SQL file

<details>
<summary>Click to expand</summary>

```sql
-- ./schema.sql

CREATE TABLE IF NOT EXISTS contracts (
    address FixedString(40),
    name Nullable(String),
    symbol Nullable(String),
    decimals Nullable(UInt8)
)
ENGINE = ReplacingMergeTree()
ORDER BY (address)
```

</details>

## Planned features

TODO

```

```
