-- ============================================================
-- Migration 012: Database Security and Performance Fixes
-- Addresses Supabase linter warnings for RLS and Duplicate Indexes
-- ============================================================

-- 1. DROP DUPLICATE INDEX on user_achievements
-- user_achievements_user_achievement_unique is already defined ( Migration 008 )
-- user_achievements_user_id_achievement_id_key is redundant and exists as a constraint
ALTER TABLE public.user_achievements DROP CONSTRAINT IF EXISTS user_achievements_user_id_achievement_id_key;

-- 2. ENABLE RLS on tables missing it
ALTER TABLE IF EXISTS public.email_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.leaderboard_rank1_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;

-- 3. DEFINE POLICIES for email_verifications
-- Allow service_role full access. This table is used during auth flow by service_role.
DROP POLICY IF EXISTS "email_verifications_service_role_all" ON public.email_verifications;
CREATE POLICY "email_verifications_service_role_all"
    ON public.email_verifications
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 4. DEFINE POLICIES for leaderboard_rank1_history
-- Allow public read, service_role write
DROP POLICY IF EXISTS "leaderboard_rank1_history_read_all" ON public.leaderboard_rank1_history;
CREATE POLICY "leaderboard_rank1_history_read_all"
    ON public.leaderboard_rank1_history
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "leaderboard_rank1_history_service_role_all" ON public.leaderboard_rank1_history;
CREATE POLICY "leaderboard_rank1_history_service_role_all"
    ON public.leaderboard_rank1_history
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 5. DEFINE POLICIES for notifications
-- Users can read their own notifications. Mapping auth.uid() (UUID) -> users.id (integer)
DROP POLICY IF EXISTS "notifications_read_own" ON public.notifications;
CREATE POLICY "notifications_read_own"
    ON public.notifications
    FOR SELECT
    TO authenticated
    USING (user_id = (SELECT id FROM public.users WHERE supabase_uid = auth.uid())::integer);

-- service_role has full access
DROP POLICY IF EXISTS "notifications_service_role_all" ON public.notifications;
CREATE POLICY "notifications_service_role_all"
    ON public.notifications
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 6. FIX overly permissive policies on user_workspaces
-- Replace "always true" policies with restrictive ones
DROP POLICY IF EXISTS "user_workspaces_delete" ON public.user_workspaces;
DROP POLICY IF EXISTS "user_workspaces_insert" ON public.user_workspaces;
DROP POLICY IF EXISTS "user_workspaces_update" ON public.user_workspaces;
DROP POLICY IF EXISTS "user_workspaces_select" ON public.user_workspaces;
DROP POLICY IF EXISTS "user_workspaces_service_role_all" ON public.user_workspaces;
DROP POLICY IF EXISTS "user_workspaces_owner_all" ON public.user_workspaces;

CREATE POLICY "user_workspaces_service_role_all"
    ON public.user_workspaces
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "user_workspaces_owner_all"
    ON public.user_workspaces
    FOR ALL
    TO authenticated
    USING (user_id = (SELECT id FROM public.users WHERE supabase_uid = auth.uid())::integer)
    WITH CHECK (user_id = (SELECT id FROM public.users WHERE supabase_uid = auth.uid())::integer);

-- ============================================================
-- DONE. All prioritized linter warnings should be resolved.
-- ============================================================
