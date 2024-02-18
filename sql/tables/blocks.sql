CREATE TABLE IF NOT EXISTS blocks (
  chain         LowCardinality(String),
  module_hash   FixedString(40),
  block_number  UInt32(),
  timestamp     DateTime64(3, 'UTC'),
  block_id      FixedString(64)
)
ENGINE = ReplacingMergeTree
ORDER BY (chain, module_hash, block_number, timestamp);
