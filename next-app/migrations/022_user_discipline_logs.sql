-- Migration 022: user_discipline_logs
CREATE TABLE IF NOT EXISTS user_discipline_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL,
    day_number INTEGER NOT NULL CHECK (day_number BETWEEN 1 AND 7),
    log_date DATE,
    total_hours NUMERIC(4,1) DEFAULT 0,
    is_missed BOOLEAN DEFAULT FALSE,
    done_tasks TEXT DEFAULT '',
    student_comment TEXT DEFAULT '',
    mentor_comment TEXT DEFAULT '',
    mentor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    mentor_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, week_number, day_number)
);

CREATE INDEX IF NOT EXISTS idx_discipline_user_week ON user_discipline_logs(user_id, week_number);
CREATE INDEX IF NOT EXISTS idx_discipline_user_id ON user_discipline_logs(user_id);
