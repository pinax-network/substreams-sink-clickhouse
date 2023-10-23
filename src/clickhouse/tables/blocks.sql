CREATE TABLE IF NOT EXISTS blocks (
  block_id      FixedString(64),
  block_number  UInt32(),
  chain         LowCardinality(String),
  timestamp     DateTime64(3, 'UTC'),
)
ENGINE = ReplacingMergeTree
PRIMARY KEY (block_id)
ORDER BY (block_id, block_number, chain, timestamp);