-- Migration 028: Add submitted_at column to user_discipline_logs
ALTER TABLE user_discipline_logs ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_discipline_submitted_at ON user_discipline_logs(submitted_at);
