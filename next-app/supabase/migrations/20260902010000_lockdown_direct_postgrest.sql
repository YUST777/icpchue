-- Migration 025: close direct PostgREST access to every user/private table.
-- The website validates requests in Next.js API routes and connects to
-- Postgres with the server role. No browser code uses Supabase tables
-- directly, so anon/authenticated table grants are unnecessary attack paths.

DO $$
DECLARE
    table_name text;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'applications', 'users', 'submissions', 'cf_submissions',
        'training_submissions', 'sheet_submissions', 'user_progress',
        'user_achievements', 'user_solve_stats', 'user_discipline_logs',
        'job_applications', 'team_registrations', 'recap_2025',
        'leaderboard_rank1_history', 'login_logs', 'password_resets',
        'email_verifications', 'notifications', 'user_activity',
        'page_navigation', 'error_logs', 'user_sessions', 'user_code',
        'user_custom_tests', 'user_notes', 'user_preferences',
        'daily_solves', 'user_streaks', 'video_ratings', 'news_reactions',
        'page_views', 'view_logs'
    ] LOOP
        IF to_regclass('public.' || table_name) IS NOT NULL THEN
            EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', table_name);
        END IF;
    END LOOP;
END;
$$;

DROP POLICY IF EXISTS "job_applications_anon_insert" ON public.job_applications;
DROP POLICY IF EXISTS "anon_insert_team_registrations" ON public.team_registrations;
