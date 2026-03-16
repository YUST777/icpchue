-- ============================================================
-- Migration 006: Fix remaining RLS linter warnings
-- For Supabase (PostgreSQL) — run in SQL Editor
-- ============================================================

-- =============================================
-- 1. FIX auth_rls_initplan on cf_submissions & user_progress
--    Move the full cast inside (select ...) so auth.uid()
--    is only evaluated once, not per-row.
-- =============================================

DROP POLICY IF EXISTS "cf_submissions_read_own" ON public.cf_submissions;
CREATE POLICY "cf_submissions_read_own"
    ON public.cf_submissions
    FOR SELECT
    TO authenticated
    USING (user_id = (select (auth.uid()::text)::bigint));

DROP POLICY IF EXISTS "user_progress_read_own" ON public.user_progress;
CREATE POLICY "user_progress_read_own"
    ON public.user_progress
    FOR SELECT
    TO authenticated
    USING (user_id = (select (auth.uid()::text)::bigint));

-- =============================================
-- 2. FIX multiple_permissive_policies on curriculum tables
--    Problem: "Admin write access" is FOR ALL TO authenticated
--    which includes SELECT, overlapping with "Public read access".
--    Fix: Scope admin write to service_role only (your Next.js
--    backend uses service_role key anyway, not authenticated).
-- =============================================

-- curriculum_levels
DROP POLICY IF EXISTS "Admin write access for curriculum_levels" ON public.curriculum_levels;
CREATE POLICY "Admin write access for curriculum_levels"
    ON public.curriculum_levels
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- curriculum_sheets
DROP POLICY IF EXISTS "Admin write access for curriculum_sheets" ON public.curriculum_sheets;
CREATE POLICY "Admin write access for curriculum_sheets"
    ON public.curriculum_sheets
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- curriculum_problems
DROP POLICY IF EXISTS "Admin write access for curriculum_problems" ON public.curriculum_problems;
CREATE POLICY "Admin write access for curriculum_problems"
    ON public.curriculum_problems
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================
-- DONE. All Supabase linter warnings should be resolved.
-- ============================================================
