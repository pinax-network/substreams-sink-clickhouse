CREATE TABLE IF NOT EXISTS deleted_entity_changes (
  id           String,
  chain        LowCardinality(String),
  source       LowCardinality(String),
  block_id     FixedString(64),
  block_number UInt32,
  module_hash  FixedString(40),
  timestamp    DateTime64(3, 'UTC'),
)
ENGINE = ReplacingMergeTree
ORDER BY (source, chain, block_number, timestamp, block_id);