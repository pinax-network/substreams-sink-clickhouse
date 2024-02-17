-- view --
CREATE MATERIALIZED VIEW IF NOT EXISTS blocks_mv
ENGINE = MergeTree
ORDER BY (chain, timestamp, block_number)
AS SELECT
    block_id,
    block_number,
    chain,
    timestamp
FROM blocks;

-- DROP TABLE IF EXISTS blocks_mv;

-- OPTIMIZE TABLE blocks_mv FINAL;

-- -- insert --
-- INSERT INTO blocks_mv SELECT
--     block_id,
--     block_number,
--     chain,
--     timestamp
-- FROM blocks;