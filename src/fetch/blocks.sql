SELECT
    chain,
    COUNT() AS count,
    COUNTDISTINCT(block_number) AS count_distinct,
    MAX(block_number) AS max,
    MIN(block_number) AS min,
    max - min + 1 AS delta,
    delta - count_distinct AS missing
FROM blocks
GROUP BY chain