CREATE TABLE IF NOT EXISTS data_buffer (
    batch_number INTEGER,

    entity_changes TEXT,
    source TEXT,

    chain TEXT,
    block_id TEXT,
    block_number INTEGER,
    is_final INTEGER, 

    module_hash TEXT,
    module_name TEXT,
    type TEXT,

    timestamp INTEGER,
    cursor TEXT
);