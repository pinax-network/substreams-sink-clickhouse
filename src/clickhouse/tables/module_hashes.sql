CREATE TABLE IF NOT EXISTS module_hashes (
    module_hash   FixedString(40),
    module_name   String(),
    chain         LowCardinality(String),
    type          String(),
)
ENGINE = ReplacingMergeTree
ORDER BY (module_hash, chain);