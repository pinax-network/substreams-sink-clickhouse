CREATE TABLE IF NOT EXISTS entity_changes(
    batch_number INTEGER,
    raw_data     TEXT,
    source       TEXT,
    id           TEXT,
    block_id     TEXT,
    module_hash  TEXT,
    chain        TEXT
);