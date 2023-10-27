CREATE TABLE IF NOT EXISTS cursors (
    cursor        String,
    module_hash   FixedString(40),
    block_id      FixedString(64),
    chain         LowCardinality(String),
)
ENGINE = ReplacingMergeTree
PRIMARY KEY (cursor)
ORDER BY (cursor, module_hash, block_id);