-- ============================================================
-- Migration 017: DB Improvements
-- Constraints, indexes, auto-updated_at trigger
-- ============================================================

-- NOT NULL constraints
ALTER TABLE public.user_achievements ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.notifications ALTER COLUMN user_id SET NOT NULL;

-- CHECK constraints for data integrity
ALTER TABLE public.user_progress ADD CONSTRAINT chk_progress_status 
    CHECK (status IN ('SOLVED', 'ATTEMPTED'));
ALTER TABLE public.notifications ADD CONSTRAINT chk_notification_type 
    CHECK (type IN ('achievement', 'leaderboard', 'system'));
ALTER TABLE public.users ADD CONSTRAINT chk_user_role 
    CHECK (role IN ('trainee', 'instructor', 'owner'));

-- Targeted indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_cf_sub_user_problem 
    ON public.cf_submissions (user_id, contest_id, problem_index) 
    WHERE verdict = 'Accepted';
CREATE INDEX IF NOT EXISTS idx_user_code_lookup 
    ON public.user_code (user_id, contest_id, problem_id, language) 
    WHERE is_submitted = false;
CREATE INDEX IF NOT EXISTS idx_daily_solves_user_date 
    ON public.daily_solves (user_id, solve_date DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id 
    ON public.notifications (user_id);

-- Auto-update updated_at on users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON public.users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
