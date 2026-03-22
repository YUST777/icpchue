-- ============================================================
-- Migration 015: Enhanced indexes + session_id for user_activity
-- Optimized for: cheating detection queries, user session analysis,
-- per-problem analytics, and high-volume INSERT performance.
-- ============================================================

-- 1. Add session_id column to group events into browser sessions
ALTER TABLE public.user_activity
    ADD COLUMN IF NOT EXISTS session_id varchar(50) DEFAULT '';

-- 2. BRIN index on created_at — much smaller than btree for time-range scans
--    (user_activity is append-only, so BRIN is ideal)
DROP INDEX IF EXISTS idx_user_activity_created_at;
CREATE INDEX IF NOT EXISTS idx_user_activity_created_at_brin
    ON public.user_activity USING brin (created_at);

-- 3. Cheating detection: find all tab switches / pastes / devtools for a user+problem
--    Query: WHERE user_id = $1 AND contest_id = $2 AND problem_id = $3 AND action IN (...)
CREATE INDEX IF NOT EXISTS idx_ua_user_problem_action
    ON public.user_activity (user_id, contest_id, problem_id, action)
    WHERE contest_id IS NOT NULL;

-- 4. Session analysis: group events by session
CREATE INDEX IF NOT EXISTS idx_ua_session
    ON public.user_activity (session_id, created_at)
    WHERE session_id != '';

-- 5. Per-user session listing (dashboard: "your recent sessions")
CREATE INDEX IF NOT EXISTS idx_ua_user_session
    ON public.user_activity (user_id, session_id, created_at DESC)
    WHERE session_id != '';

-- 6. Sheet-level analytics: all activity for a sheet (leaderboard, engagement)
CREATE INDEX IF NOT EXISTS idx_ua_sheet_action
    ON public.user_activity (sheet_id, action, created_at DESC)
    WHERE sheet_id IS NOT NULL;

-- 7. High-frequency event filtering: heartbeats + problem_leave for time analysis
CREATE INDEX IF NOT EXISTS idx_ua_user_time_events
    ON public.user_activity (user_id, action, created_at DESC)
    WHERE action IN ('heartbeat', 'problem_leave', 'problem_view');

-- 8. Cheating report: all suspicious actions for a user in a time window
CREATE INDEX IF NOT EXISTS idx_ua_suspicious
    ON public.user_activity (user_id, created_at DESC)
    WHERE action IN ('tab_hidden', 'code_paste', 'devtools_open', 'print_attempt', 'window_blur');

-- 9. Drop redundant indexes that are covered by new composite ones
DROP INDEX IF EXISTS idx_user_activity_action;
DROP INDEX IF EXISTS idx_user_activity_user_action;
DROP INDEX IF EXISTS idx_user_activity_contest_problem;

-- 10. Partial index for problem_leave events (time-to-solve analysis)
CREATE INDEX IF NOT EXISTS idx_ua_problem_leave
    ON public.user_activity (user_id, contest_id, problem_id, created_at)
    WHERE action = 'problem_leave';

-- Summary of query patterns these indexes serve:
--
-- Cheating detection per problem:
--   SELECT * FROM user_activity
--   WHERE user_id=$1 AND contest_id=$2 AND problem_id=$3
--     AND action IN ('tab_hidden','code_paste','devtools_open','window_blur')
--   → uses idx_ua_user_problem_action
--
-- User session timeline:
--   SELECT * FROM user_activity
--   WHERE session_id=$1 ORDER BY created_at
--   → uses idx_ua_session
--
-- Time-to-solve analysis:
--   SELECT metadata->>'totalTimeMs' FROM user_activity
--   WHERE user_id=$1 AND action='problem_leave' AND contest_id=$2
--   → uses idx_ua_problem_leave
--
-- Sheet engagement dashboard:
--   SELECT action, count(*) FROM user_activity
--   WHERE sheet_id=$1 GROUP BY action
--   → uses idx_ua_sheet_action
--
-- Suspicious activity report:
--   SELECT * FROM user_activity
--   WHERE user_id=$1 AND action IN ('tab_hidden','code_paste',...)
--   ORDER BY created_at DESC LIMIT 100
--   → uses idx_ua_suspicious
