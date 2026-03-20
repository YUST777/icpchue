-- Migration: Add user notes table (updated to use local user id)
DROP TABLE IF EXISTS user_notes;

CREATE TABLE IF NOT EXISTS user_notes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contest_id TEXT NOT NULL,
    problem_index TEXT NOT NULL,
    content TEXT DEFAULT '',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, contest_id, problem_index)
);

-- Index for faster lookup
CREATE INDEX IF NOT EXISTS idx_user_notes_user_id ON user_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notes_problem ON user_notes(contest_id, problem_index);
