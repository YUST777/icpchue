-- Integrity report: per-problem keystroke totals from "problem_leave" events.
-- Partial index so the lookup reads only those rows (a few % of user_activity).
CREATE INDEX CONCURRENTLY IF NOT EXISTS user_activity_problem_leave_idx
    ON public.user_activity (user_id, contest_id, problem_id, ((metadata->>'keystrokes')::int))
    WHERE action = 'problem_leave';
