-- Migration 024: close direct PostgREST access to private/application data.
-- The Next.js API uses the postgres/service_role connection and remains the
-- only place where these records are read or written.

-- Discipline logs contain study comments and mentor feedback. This table was
-- created without RLS, which made every column directly readable/writable by
-- anon/authenticated clients despite the API authorization checks.
ALTER TABLE public.user_discipline_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "discipline_service_role_all" ON public.user_discipline_logs;
CREATE POLICY "discipline_service_role_all"
    ON public.user_discipline_logs FOR ALL TO service_role
    USING (true) WITH CHECK (true);
REVOKE ALL ON public.user_discipline_logs FROM anon, authenticated;

-- Job applications include phone numbers and national IDs. Public forms are
-- submitted through /api/job/apply, not directly through PostgREST.
DROP POLICY IF EXISTS "Allow authenticated reads on job_applications" ON public.job_applications;
DROP POLICY IF EXISTS "Allow public inserts on job_applications" ON public.job_applications;
CREATE POLICY "job_applications_anon_insert"
    ON public.job_applications FOR INSERT TO anon
    WITH CHECK (true);
DROP POLICY IF EXISTS "job_applications_service_role_all" ON public.job_applications;
CREATE POLICY "job_applications_service_role_all"
    ON public.job_applications FOR ALL TO service_role
    USING (true) WITH CHECK (true);
REVOKE SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.job_applications FROM anon, authenticated;
REVOKE INSERT ON public.job_applications FROM authenticated;

-- Recap snapshots and achievements are served by filtered API endpoints. Do
-- not expose the raw tables, which would permit bulk scraping or tampering.
DROP POLICY IF EXISTS "recap_2025_public_read" ON public.recap_2025;
DROP POLICY IF EXISTS "recap_2025_authenticated_write" ON public.recap_2025;
DROP POLICY IF EXISTS "recap_2025_service_role_all" ON public.recap_2025;
CREATE POLICY "recap_2025_service_role_all"
    ON public.recap_2025 FOR ALL TO service_role
    USING (true) WITH CHECK (true);
REVOKE ALL ON public.recap_2025 FROM anon, authenticated;

DROP POLICY IF EXISTS "user_achievements_select_all" ON public.user_achievements;
DROP POLICY IF EXISTS "user_achievements_service_role_all" ON public.user_achievements;
CREATE POLICY "user_achievements_service_role_all"
    ON public.user_achievements FOR ALL TO service_role
    USING (true) WITH CHECK (true);
REVOKE ALL ON public.user_achievements FROM anon, authenticated;

-- These aggregate/history tables are consumed by server APIs. Their former
-- public SELECT policies leaked internal user IDs and made bulk enumeration
-- possible through the Supabase URL.
DROP POLICY IF EXISTS "public_read_solve_stats" ON public.user_solve_stats;
REVOKE ALL ON public.user_solve_stats FROM anon, authenticated;
DROP POLICY IF EXISTS "leaderboard_rank1_history_read_all" ON public.leaderboard_rank1_history;
REVOKE ALL ON public.leaderboard_rank1_history FROM anon, authenticated;
