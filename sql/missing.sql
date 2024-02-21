SELECT
    stop_block_number - 10000 as start_block_number,
    t * 10000 as stop_block_number,
    10000 - c as missing
    FROM (
        SELECT
            floor(block_number / 10000) AS t,
            count() AS c,
            max(block_number) AS m
        FROM blocks
        WHERE chain = {chain: String} and module_hash = {module_hash: String}
        GROUP BY t
        ORDER BY t ASC WITH FILL
    )
WHERE c < 10000