CREATE TABLE journal_entry_chunks (
    chunk_id SERIAL PRIMARY KEY,
    journal_id VARCHAR(255) NOT NULL,
    chunk_index INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    embedding vector,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (journal_id) REFERENCES journal_entries(journal_id) ON DELETE CASCADE
);

-- Optional: Add an index for faster querying by journal_id and chunk_index
CREATE INDEX idx_journal_chunks ON journal_entry_chunks (journal_id, chunk_index);