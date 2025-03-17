CREATE TABLE journal_entries (
    journal_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    entry_text TEXT NOT NULL,
    emotion_labels TEXT[] NOT NULL,
    entry_date DATE UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    last_modified TIMESTAMPTZ DEFAULT NOW() NOT NULL
);