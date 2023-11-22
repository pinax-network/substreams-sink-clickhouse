CREATE TABLE IF NOT EXISTS deleted_entity_changes (
  id           String,
  chain        LowCardinality(String),
  source       LowCardinality(String),
  block_id     FixedString(64),
  block_number UInt32,
  module_hash  FixedString(40),
  timestamp    DateTime64(3, 'UTC'),
  cursor       String,
)
ENGINE = ReplacingMergeTree
PRIMARY KEY (source, block_id)
ORDER BY (source, block_id, block_number, chain, timestamp);