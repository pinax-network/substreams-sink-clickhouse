SELECT latest_cursor
FROM module_hashes
WHERE chain = {chain: String} AND module_hash = {module_hash: String}
LIMIT 1