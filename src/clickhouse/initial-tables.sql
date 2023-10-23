-- manifest table
CREATE TABLE IF NOT EXISTS manifest (
    module_hash   FixedString(40),
    module_name   String(),
    chain         LowCardinality(String),
    type          String(),
)
ENGINE = ReplacingMergeTree
ORDER BY (module_hash);

-- block table
CREATE TABLE IF NOT EXISTS block (
  block_id      FixedString(64),
  block_number  UInt32(),
  chain         LowCardinality(String),
  timestamp     DateTime64(3, 'UTC'),
  final_block   Bool,
)
ENGINE = ReplacingMergeTree
PRIMARY KEY (block_id)
ORDER BY (block_id, block_number, timestamp);

-- unparsed_json table
CREATE TABLE IF NOT EXISTS unparsed_json (
  raw_data    JSON,
  source      LowCardinality(String),
  id          String,
  block_id    FixedString(64),
  module_hash FixedString(40),
  chain       LowCardinality(String)
)
ENGINE = MergeTree
ORDER BY (source, chain, module_hash, block_id);
