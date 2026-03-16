-- Create table for tracking leaderboard Rank 1 movement
CREATE TABLE IF NOT EXISTS leaderboard_rank1_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    previous_user_id INTEGER REFERENCES users(id),
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    trigger_type TEXT NOT NULL -- 'submission', 'refresh', etc.
);

-- Index for quick lookup of current holder
CREATE INDEX IF NOT EXISTS idx_rank1_history_captured_at ON leaderboard_rank1_history(captured_at DESC);
