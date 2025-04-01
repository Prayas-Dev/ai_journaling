CREATE TABLE journal_entries (
    journal_id VARCHAR(255) PRIMARY KEY,
    user_id INT NOT NULL,
    entry_text TEXT NOT NULL,
    emotion_labels TEXT[] DEFAULT '{}',
    entry_date TIMESTAMP DEFAULT NOW(),
    last_modified TIMESTAMP DEFAULT NOW()
);
