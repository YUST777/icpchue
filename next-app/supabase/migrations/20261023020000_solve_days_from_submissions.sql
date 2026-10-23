-- Solve days (heatmap) and streaks are derived from Accepted submissions,
-- however they arrive (problem sync, history backfill, live verdicts).
-- Previously nothing in the app wrote daily_solves/user_streaks for synced
-- solves, so many students showed 0 solves / 0-day streaks.

CREATE OR REPLACE FUNCTION public.recompute_solve_days(p_user bigint) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
    DELETE FROM public.daily_solves WHERE user_id = p_user;
    DELETE FROM public.user_streaks WHERE user_id = p_user;

    -- One solve per problem, on the day it was first accepted (Cairo time).
    WITH firsts AS (
        SELECT season_year, (min(submitted_at) AT TIME ZONE 'Africa/Cairo')::date AS d
          FROM public.submissions
         WHERE user_id = p_user AND verdict IN ('Accepted', 'OK') AND submitted_at IS NOT NULL
         GROUP BY season_year, contest_id, upper(problem_index)
    )
    INSERT INTO public.daily_solves (user_id, solve_date, solve_count, season_year, created_at, updated_at)
    SELECT p_user, d, count(*)::int, max(season_year), now(), now() FROM firsts GROUP BY d;

    -- Streaks per season from consecutive solve days.
    INSERT INTO public.user_streaks (season_year, user_id, current_streak, max_streak, last_solve_date, updated_at)
    SELECT season_year, p_user,
           COALESCE(max(len) FILTER (WHERE last_day >= (now() AT TIME ZONE 'Africa/Cairo')::date - 1), 0),
           max(len), max(last_day), now()
      FROM (
          SELECT season_year, count(*)::int AS len, max(solve_date) AS last_day
            FROM (SELECT season_year, solve_date,
                         solve_date - (row_number() OVER (PARTITION BY season_year ORDER BY solve_date))::int AS grp
                    FROM public.daily_solves WHERE user_id = p_user) runs
           GROUP BY season_year, grp
      ) islands
     GROUP BY season_year;
END $$;

CREATE OR REPLACE FUNCTION public.recompute_solve_days_trigger() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE u bigint;
BEGIN
    FOR u IN SELECT DISTINCT user_id FROM new_rows WHERE user_id IS NOT NULL LOOP
        PERFORM public.recompute_solve_days(u);
    END LOOP;
    RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_solve_days_insert ON public.submissions;
CREATE TRIGGER trg_solve_days_insert AFTER INSERT ON public.submissions
    REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION public.recompute_solve_days_trigger();
DROP TRIGGER IF EXISTS trg_solve_days_update ON public.submissions;
CREATE TRIGGER trg_solve_days_update AFTER UPDATE ON public.submissions
    REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION public.recompute_solve_days_trigger();

-- Rebuild for everyone with an Accepted submission.
DO $$ DECLARE u bigint; BEGIN
    FOR u IN SELECT DISTINCT user_id FROM public.submissions WHERE verdict IN ('Accepted', 'OK') LOOP
        PERFORM public.recompute_solve_days(u);
    END LOOP;
END $$;
