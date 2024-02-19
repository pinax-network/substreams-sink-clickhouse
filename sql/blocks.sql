SELECT
    chain,
    module_hash,
    COUNT() AS count,
    COUNTDISTINCT(block_number) AS count_distinct,
    MIN(block_number) AS min,
    MAX(block_number) AS max,
    max - min + 1 AS delta,
    delta - count_distinct AS missing,
    count - count_distinct AS optimize
FROM blocks
WHERE chain = {chain: String}
GROUP BY (chain, module_hash)