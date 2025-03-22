CREATE TABLE journal_embeddings (
    journal_id UUID PRIMARY KEY REFERENCES journal_entries(journal_id) ON DELETE CASCADE,
    embedding VECTOR(768) NOT NULL
);
