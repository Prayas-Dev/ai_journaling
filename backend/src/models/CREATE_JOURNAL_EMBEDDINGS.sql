-- Create the journal_embeddings table
CREATE TABLE journal_embeddings (
    journal_id INT PRIMARY KEY REFERENCES journal_entries(journal_id) ON DELETE CASCADE,
    embedding VECTOR(768) NOT NULL
);