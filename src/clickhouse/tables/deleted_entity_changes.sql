CREATE TABLE IF NOT EXISTS deleted_entity_changes (
  chain        LowCardinality(String),
  source       LowCardinality(String),
  block_id     FixedString(64),
  block_number UInt32,
  module_hash  FixedString(40),
  timestamp    DateTime64(3, 'UTC'),
)
ENGINE = ReplacingMergeTree
PRIMARY KEY (source, block_id)
ORDER BY (source, block_id, block_number, chain, timestamp);