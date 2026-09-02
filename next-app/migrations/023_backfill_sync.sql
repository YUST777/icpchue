-- Durable state used by the client-triggered Codeforces synchronizer.
-- The lease prevents multiple dashboard tabs from running the same expensive
-- API import at once; last_auto_backfill records a completed public sync.
ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS last_auto_backfill timestamptz DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS auto_backfill_lease_until timestamptz DEFAULT NULL;

-- Older installations created these tables before the season partition was
-- introduced. Keep the batch trigger compatible with both schemas.
ALTER TABLE public.submissions
    ADD COLUMN IF NOT EXISTS season_year smallint
        NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::smallint;
ALTER TABLE public.user_solve_stats
    ADD COLUMN IF NOT EXISTS season_year smallint
        NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::smallint;
CREATE UNIQUE INDEX IF NOT EXISTS user_solve_stats_season_user_uidx
    ON public.user_solve_stats (season_year, user_id);

CREATE INDEX IF NOT EXISTS idx_users_auto_backfill_due
    ON public.users (last_auto_backfill)
    WHERE last_auto_backfill IS NOT NULL;

-- The old trigger recalculated all solve statistics once per imported row. A
-- statement-level trigger reduces a 500-row import to one aggregate refresh.
DROP TRIGGER IF EXISTS trg_update_solve_stats ON public.submissions;

CREATE OR REPLACE FUNCTION public.update_solve_stats_on_submission_batch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.user_solve_stats (
        season_year, user_id, distinct_solved, total_submissions, total_accepted,
        first_solve_at, last_solve_at
    )
    SELECT affected.season_year, affected.user_id,
           COUNT(DISTINCT s.contest_id || '-' || s.problem_index)
             FILTER (WHERE s.verdict = 'Accepted' AND s.source = 'codeforces'),
           COUNT(*) FILTER (WHERE s.source = 'codeforces'),
           COUNT(*) FILTER (WHERE s.verdict = 'Accepted' AND s.source = 'codeforces'),
           MIN(s.submitted_at) FILTER (WHERE s.verdict = 'Accepted'),
           MAX(s.submitted_at) FILTER (WHERE s.verdict = 'Accepted')
    FROM (SELECT DISTINCT season_year, user_id FROM new_rows) affected
    JOIN public.submissions s ON s.user_id = affected.user_id AND s.season_year = affected.season_year
    GROUP BY affected.season_year, affected.user_id
    ON CONFLICT (season_year, user_id) DO UPDATE SET
        distinct_solved = EXCLUDED.distinct_solved,
        total_submissions = EXCLUDED.total_submissions,
        total_accepted = EXCLUDED.total_accepted,
        first_solve_at = EXCLUDED.first_solve_at,
        last_solve_at = EXCLUDED.last_solve_at,
        updated_at = now();
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_solve_stats_insert ON public.submissions;
DROP TRIGGER IF EXISTS trg_update_solve_stats_update ON public.submissions;

CREATE TRIGGER trg_update_solve_stats_insert
    AFTER INSERT ON public.submissions
    REFERENCING NEW TABLE AS new_rows
    FOR EACH STATEMENT
    EXECUTE FUNCTION public.update_solve_stats_on_submission_batch();

CREATE TRIGGER trg_update_solve_stats_update
    AFTER UPDATE ON public.submissions
    REFERENCING NEW TABLE AS new_rows
    FOR EACH STATEMENT
    EXECUTE FUNCTION public.update_solve_stats_on_submission_batch();
