-- Migration 018: Fix RLS initplan performance + drop unused indexes
-- ============================================================
-- Fix RLS policies: wrap auth.uid() in (select ...) for performance
-- This prevents re-evaluation per row (initplan optimization)
-- ============================================================

-- error_logs
DROP POLICY IF EXISTS "Authenticated can insert errors" ON error_logs;
CREATE POLICY "Authenticated can insert errors" ON error_logs FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Users can read own errors" ON error_logs;
CREATE POLICY "Users can read own errors" ON error_logs FOR SELECT USING ((select auth.uid()) = (SELECT users.supabase_uid FROM users WHERE users.id = error_logs.user_id));

-- page_navigation
DROP POLICY IF EXISTS "Authenticated can insert navigation" ON page_navigation;
CREATE POLICY "Authenticated can insert navigation" ON page_navigation FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Users can read own navigation" ON page_navigation;
CREATE POLICY "Users can read own navigation" ON page_navigation FOR SELECT USING ((select auth.uid()) = (SELECT users.supabase_uid FROM users WHERE users.id = page_navigation.user_id));

-- user_activity
DROP POLICY IF EXISTS "Authenticated can insert activity" ON user_activity;
CREATE POLICY "Authenticated can insert activity" ON user_activity FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Users can read own activity" ON user_activity;
CREATE POLICY "Users can read own activity" ON user_activity FOR SELECT USING ((select auth.uid()) = (SELECT users.supabase_uid FROM users WHERE users.id = user_activity.user_id));

-- user_code
DROP POLICY IF EXISTS "Users can insert own code" ON user_code;
CREATE POLICY "Users can insert own code" ON user_code FOR INSERT WITH CHECK ((select auth.uid()) = (SELECT users.supabase_uid FROM users WHERE users.id = user_code.user_id));

DROP POLICY IF EXISTS "Users can read own code" ON user_code;
CREATE POLICY "Users can read own code" ON user_code FOR SELECT USING ((select auth.uid()) = (SELECT users.supabase_uid FROM users WHERE users.id = user_code.user_id));

DROP POLICY IF EXISTS "Users can update own code" ON user_code;
CREATE POLICY "Users can update own code" ON user_code FOR UPDATE USING ((select auth.uid()) = (SELECT users.supabase_uid FROM users WHERE users.id = user_code.user_id));

-- user_custom_tests
DROP POLICY IF EXISTS "Users can insert own tests" ON user_custom_tests;
CREATE POLICY "Users can insert own tests" ON user_custom_tests FOR INSERT WITH CHECK ((select auth.uid()) = (SELECT users.supabase_uid FROM users WHERE users.id = user_custom_tests.user_id));

DROP POLICY IF EXISTS "Users can read own tests" ON user_custom_tests;
CREATE POLICY "Users can read own tests" ON user_custom_tests FOR SELECT USING ((select auth.uid()) = (SELECT users.supabase_uid FROM users WHERE users.id = user_custom_tests.user_id));

DROP POLICY IF EXISTS "Users can update own tests" ON user_custom_tests;
CREATE POLICY "Users can update own tests" ON user_custom_tests FOR UPDATE USING ((select auth.uid()) = (SELECT users.supabase_uid FROM users WHERE users.id = user_custom_tests.user_id));

-- user_notes
DROP POLICY IF EXISTS "Users can insert own notes" ON user_notes;
CREATE POLICY "Users can insert own notes" ON user_notes FOR INSERT WITH CHECK ((select auth.uid()) = (SELECT users.supabase_uid FROM users WHERE users.id = user_notes.user_id));

DROP POLICY IF EXISTS "Users can read own notes" ON user_notes;
CREATE POLICY "Users can read own notes" ON user_notes FOR SELECT USING ((select auth.uid()) = (SELECT users.supabase_uid FROM users WHERE users.id = user_notes.user_id));

DROP POLICY IF EXISTS "Users can update own notes" ON user_notes;
CREATE POLICY "Users can update own notes" ON user_notes FOR UPDATE USING ((select auth.uid()) = (SELECT users.supabase_uid FROM users WHERE users.id = user_notes.user_id));

-- user_preferences
DROP POLICY IF EXISTS "Users can insert own prefs" ON user_preferences;
CREATE POLICY "Users can insert own prefs" ON user_preferences FOR INSERT WITH CHECK ((select auth.uid()) = (SELECT users.supabase_uid FROM users WHERE users.id = user_preferences.user_id));

DROP POLICY IF EXISTS "Users can read own prefs" ON user_preferences;
CREATE POLICY "Users can read own prefs" ON user_preferences FOR SELECT USING ((select auth.uid()) = (SELECT users.supabase_uid FROM users WHERE users.id = user_preferences.user_id));

DROP POLICY IF EXISTS "Users can update own prefs" ON user_preferences;
CREATE POLICY "Users can update own prefs" ON user_preferences FOR UPDATE USING ((select auth.uid()) = (SELECT users.supabase_uid FROM users WHERE users.id = user_preferences.user_id));

-- user_sessions
DROP POLICY IF EXISTS "Authenticated can insert sessions" ON user_sessions;
CREATE POLICY "Authenticated can insert sessions" ON user_sessions FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated can update sessions" ON user_sessions;
CREATE POLICY "Authenticated can update sessions" ON user_sessions FOR UPDATE USING ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Users can read own sessions" ON user_sessions;
CREATE POLICY "Users can read own sessions" ON user_sessions FOR SELECT USING ((select auth.uid()) = (SELECT users.supabase_uid FROM users WHERE users.id = user_sessions.user_id));

-- video_ratings
DROP POLICY IF EXISTS "Users can insert own ratings" ON video_ratings;
CREATE POLICY "Users can insert own ratings" ON video_ratings FOR INSERT WITH CHECK ((select auth.uid()) = (SELECT users.supabase_uid FROM users WHERE users.id = video_ratings.user_id));

DROP POLICY IF EXISTS "Users can update own ratings" ON video_ratings;
CREATE POLICY "Users can update own ratings" ON video_ratings FOR UPDATE USING ((select auth.uid()) = (SELECT users.supabase_uid FROM users WHERE users.id = video_ratings.user_id));

DROP POLICY IF EXISTS "Users can delete own ratings" ON video_ratings;
CREATE POLICY "Users can delete own ratings" ON video_ratings FOR DELETE USING ((select auth.uid()) = (SELECT users.supabase_uid FROM users WHERE users.id = video_ratings.user_id));

-- ============================================================
-- Drop unused indexes (flagged by Supabase advisor)
-- ============================================================
DROP INDEX IF EXISTS idx_login_logs_user_recent;
DROP INDEX IF EXISTS idx_notifications_user_id;
DROP INDEX IF EXISTS idx_user_sessions_recent;
DROP INDEX IF EXISTS idx_page_nav_user;
DROP INDEX IF EXISTS idx_page_nav_type;
DROP INDEX IF EXISTS idx_error_logs_recent;
DROP INDEX IF EXISTS idx_error_logs_user;
DROP INDEX IF EXISTS idx_apps_telephone_blind;
DROP INDEX IF EXISTS idx_apps_student_id_blind;
DROP INDEX IF EXISTS idx_cf_sub_sheet;
DROP INDEX IF EXISTS idx_news_reactions_news;
DROP INDEX IF EXISTS idx_user_activity_created;
DROP INDEX IF EXISTS idx_page_nav_entered;
DROP INDEX IF EXISTS idx_rank1_history_user_id;
DROP INDEX IF EXISTS idx_rank1_history_previous_user_id;

-- Drop duplicate index on user_achievements (keep idx_user_achievements_user_id)
DROP INDEX IF EXISTS idx_user_achievements_user;
