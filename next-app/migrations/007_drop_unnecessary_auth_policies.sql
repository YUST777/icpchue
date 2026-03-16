-- ============================================================
-- Migration 007: Drop unnecessary auth.uid() RLS policies
-- 
-- This app uses custom JWT auth (verifyAuth) + service_role key.
-- It does NOT use Supabase Auth, so auth.uid() returns NULL.
-- The "read_own" policies are dead code — remove them.
-- The service_role policies already grant full access to the backend.
-- ============================================================

DROP POLICY IF EXISTS "cf_submissions_read_own" ON public.cf_submissions;
DROP POLICY IF EXISTS "user_progress_read_own" ON public.user_progress;

-- ============================================================
-- DONE. Only service_role policies remain — which is correct
-- since all DB access goes through your Next.js API (service_role).
-- ============================================================
