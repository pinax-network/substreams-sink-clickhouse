CREATE TABLE IF NOT EXISTS cursors (
    batch_number  INTEGER,
    cursor        TEXT,
    module_hash   TEXT,
    block_id      TEXT,
    block_number  INTEGER,
    chain         TEXT
);