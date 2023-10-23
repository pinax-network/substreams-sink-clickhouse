CREATE TABLE IF NOT EXISTS final_blocks (
  block_id      FixedString(64),
)
ENGINE = ReplacingMergeTree
ORDER BY (block_id);