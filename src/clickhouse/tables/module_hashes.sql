CREATE TABLE IF NOT EXISTS module_hashes (
    module_hash         FixedString(40),
    module_name         String,
    chain               LowCardinality(String),
    type                String,
    latest_cursor       String,
    latest_block_number UInt32,
    latest_block_id     FixedString(64),
)
ENGINE = ReplacingMergeTree
ORDER BY (module_hash, chain);