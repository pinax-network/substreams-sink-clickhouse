CREATE TABLE IF NOT EXISTS unparsed_json (
  raw_data    String,
  source      LowCardinality(String),
  id          String,
  block_id    FixedString(64),
  module_hash FixedString(40),
  chain       LowCardinality(String)
)
ENGINE = Null; 