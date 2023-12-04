# Database

## Table of contents

- [Complete structure](#complete-structure)
- [Sorting keys](#sorting-keys)
- [Default structure](#default-structure)
- [No schema structure](#no-schema-structure)

## Complete structure

```mermaid
erDiagram
    USER_DIMENSION }|--|{ blocks : " "
    module_hashes }|--|{ USER_DIMENSION : " "
    USER_DIMENSION }|--|{ cursors : " "

    deleted_entity_changes }|--|{ blocks : " "
    module_hashes }|--|{ deleted_entity_changes : " "
    deleted_entity_changes }|--|{ cursors : " "

    unparsed_json }|--|{ blocks : " "
    module_hashes }|--|{ unparsed_json : " "
    unparsed_json }|--|{ cursors : " "

    blocks }|--|{ final_blocks : " "

    USER_DIMENSION {
        user_data unknown
        id String
        chain LowCardinality(String)
        block_id FixedString(64)
        block_number UInt32
        module_hash FixedString(40)
        timestamp DateTime(3_UTC)
   }

    deleted_entity_changes {
        source LowCardinality(String)
        id String
        chain LowCardinality(String)
        block_id FixedString(64)
        block_number UInt32
        module_hash FixedString(40)
        timestamp DateTime(3_UTC)
   }

    unparsed_json {
        raw_data    String
        source      LowCardinality(String)
        id          String
        block_id    FixedString(64)
        module_hash FixedString(40)
        chain       LowCardinality(String)
    }

    blocks {
          block_id FixedString(64)
          block_number UInt32
          chain LowCardinality(String)
          timestamp DateTime64(3_UTC)
    }

    module_hashes {
        module_hash         FixedString(40)
        module_name         String
        chain               LowCardinality(String)
        type                String
        latest_cursor       String
        latest_block_number UInt32
        latest_block_id     FixedString(64)
        latest_timestamp    DateTime64(3_UTC)
    }

    final_blocks {
        block_id FixedString(64)
    }

    cursors {
        cursor        String
        module_hash   FixedString(40)
        block_id      FixedString(64)
        block_number  String
        chain         LowCardinality(String)
    }
```

## Sorting keys

| Table                  | Fields                                               |
| ---------------------- | ---------------------------------------------------- |
| blocks                 | `(block_id, chain, block_number, timestamp)`         |
| deleted_entity_changes | `(source, chain, block_number, timestamp, block_id)` |
| module_hashes          | `(chain, module_hash)`                               |
| final_blocks           | `block_id`                                           |
| unparsed_json          | -                                                    |

## Default structure

_Every table is always present. This diagram hides unused tables._

This is the default database structure when using a schema.
`USER_DIMENSION` is replaced by your custom table.
`user_data` stands for every column that will be added.

```mermaid
erDiagram
    USER_DIMENSION }|--|{ blocks : " "
    USER_DIMENSION }|--|{ module_hashes : " "
    USER_DIMENSION }|--|{ cursors : " "

    blocks }|--|{ final_blocks : " "

    USER_DIMENSION {
        user_data unknown
        id String
        chain LowCardinality(String)
        block_id FixedString(64)
        block_number UInt32
        module_hash FixedString(40)
        timestamp DateTime(3_UTC)
   }

    blocks {
          block_id FixedString(64)
          block_number UInt32
          chain LowCardinality(String)
          timestamp DateTime64(3_UTC)
    }

    module_hashes {
        module_hash         FixedString(40)
        module_name         String
        chain               LowCardinality(String)
        type                String
        latest_cursor       String
        latest_block_number UInt32
        latest_block_id     FixedString(64)
        latest_timestamp    DateTime64(3_UTC)
    }

    final_blocks {
        block_id FixedString(64)
    }

    cursors {
        cursor        String
        module_hash   FixedString(40)
        block_id      FixedString(64)
        block_number  String
        chain         LowCardinality(String)
    }
```

## No schema structure

_Every table is always present. This diagram hides unused tables._

When no table is found for the incoming substreams and the sink is executed with `--allow-unparsed true`, the received data is inserted in `unparsed_json`. This table has a `NULL` engine. It is intended to be used with a [materialized view](https://clickhouse.com/docs/en/guides/developer/cascading-materialized-views) to fully customize the final data.

See [ClickHouse docs](https://clickhouse.com/docs/en/integrations/data-formats/json#using-materialized-views) for more details.

![](/docs/mv_workflow.png)

```mermaid
erDiagram
    unparsed_json }|--|{ blocks : " "
    unparsed_json }|--|{ module_hashes : " "
    unparsed_json }|--|{ cursors : " "

    blocks }|--|{ final_blocks : " "

    unparsed_json {
        raw_data    String
        source      LowCardinality(String)
        id          String
        block_id    FixedString(64)
        module_hash FixedString(40)
        chain       LowCardinality(String)
    }

    blocks {
          block_id FixedString(64)
          block_number UInt32
          chain LowCardinality(String)
          timestamp DateTime64(3_UTC)
    }

    module_hashes {
        module_hash         FixedString(40)
        module_name         String
        chain               LowCardinality(String)
        type                String
        latest_cursor       String
        latest_block_number UInt32
        latest_block_id     FixedString(64)
        latest_timestamp    DateTime64(3_UTC)
    }

    final_blocks {
        block_id FixedString(64)
    }

    cursors {
        cursor        String
        module_hash   FixedString(40)
        block_id      FixedString(64)
        block_number  String
        chain         LowCardinality(String)
    }
```
