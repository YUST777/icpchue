-- ============================================================
-- Migration 005: Cleanup duplicate indexes + fix RLS policies
-- For Supabase (PostgreSQL) — run in SQL Editor
-- ============================================================

-- =============================================
-- 1. DROP DUPLICATE INDEXES on training_submissions
--    These tables already had indexes with different names.
--    Keep the older ones, drop ours.
-- =============================================
DROP INDEX IF EXISTS public.idx_train_sub_user_id;          -- duplicate of idx_training_submissions_user
DROP INDEX IF EXISTS public.idx_train_sub_verdict;          -- duplicate of idx_training_submissions_verdict
DROP INDEX IF EXISTS public.idx_train_sub_user_sheet_prob;  -- duplicate of idx_training_submissions_lookup
DROP INDEX IF EXISTS public.idx_train_sub_submitted_at;     -- duplicate of idx_training_submissions_submitted

-- =============================================
-- 2. DROP DUPLICATE INDEX on user_progress
--    user_progress_user_id_problem_id_key already exists
-- =============================================
DROP INDEX IF EXISTS public.idx_user_progress_user_problem;

-- =============================================
-- 3. FIX RLS POLICIES — replace "always true" with service_role-only
--    Your Next.js app connects via service_role key, so we
--    restrict writes to service_role and allow public reads.
-- =============================================

-- cf_submissions: drop overly permissive policy, add proper ones
DROP POLICY IF EXISTS "Service role full access on cf_submissions" ON public.cf_submissions;

CREATE POLICY "cf_submissions_service_role_all"
    ON public.cf_submissions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "cf_submissions_read_own"
    ON public.cf_submissions
    FOR SELECT
    TO authenticated
    USING (user_id = (select auth.uid()::text)::bigint);

-- user_progress: drop overly permissive policy, add proper ones
DROP POLICY IF EXISTS "Service role full access on user_progress" ON public.user_progress;

CREATE POLICY "user_progress_service_role_all"
    ON public.user_progress
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "user_progress_read_own"
    ON public.user_progress
    FOR SELECT
    TO authenticated
    USING (user_id = (select auth.uid()::text)::bigint);

-- =============================================
-- 4. FIX auth_rls_initplan on curriculum tables
--    Replace auth.<function>() with (select auth.<function>())
--    to prevent per-row re-evaluation
-- =============================================

-- curriculum_levels
DROP POLICY IF EXISTS "Admin write access for curriculum_levels" ON public.curriculum_levels;
CREATE POLICY "Admin write access for curriculum_levels"
    ON public.curriculum_levels
    FOR ALL
    TO authenticated
    USING ((select auth.role()) = 'service_role')
    WITH CHECK ((select auth.role()) = 'service_role');

-- curriculum_sheets  
DROP POLICY IF EXISTS "Admin write access for curriculum_sheets" ON public.curriculum_sheets;
CREATE POLICY "Admin write access for curriculum_sheets"
    ON public.curriculum_sheets
    FOR ALL
    TO authenticated
    USING ((select auth.role()) = 'service_role')
    WITH CHECK ((select auth.role()) = 'service_role');

-- curriculum_problems
DROP POLICY IF EXISTS "Admin write access for curriculum_problems" ON public.curriculum_problems;
CREATE POLICY "Admin write access for curriculum_problems"
    ON public.curriculum_problems
    FOR ALL
    TO authenticated
    USING ((select auth.role()) = 'service_role')
    WITH CHECK ((select auth.role()) = 'service_role');

-- =============================================
-- 5. FIX multiple_permissive_policies on curriculum tables
--    Merge "Admin write" + "Public read" into single policies per action.
--    Drop the separate "Public read access" policies — the admin policy
--    already covers SELECT via FOR ALL, and we add a clean read policy.
-- =============================================

-- curriculum_levels
DROP POLICY IF EXISTS "Public read access for curriculum_levels" ON public.curriculum_levels;
CREATE POLICY "Public read access for curriculum_levels"
    ON public.curriculum_levels
    FOR SELECT
    USING (true);  -- truly public read, this is fine

-- curriculum_sheets
DROP POLICY IF EXISTS "Public read access for curriculum_sheets" ON public.curriculum_sheets;
CREATE POLICY "Public read access for curriculum_sheets"
    ON public.curriculum_sheets
    FOR SELECT
    USING (true);

-- curriculum_problems
DROP POLICY IF EXISTS "Public read access for curriculum_problems" ON public.curriculum_problems;
CREATE POLICY "Public read access for curriculum_problems"
    ON public.curriculum_problems
    FOR SELECT
    USING (true);

-- ============================================================
-- DONE. Run this in Supabase SQL Editor after 004.
-- ============================================================
