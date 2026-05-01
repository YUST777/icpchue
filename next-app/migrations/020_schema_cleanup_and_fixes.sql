-- Migration 020: Schema Cleanup & Bug Fixes
-- Based on full audit of all 55 API routes and 95+ SQL queries
-- Applied in 4 parts to handle dependency ordering
-- ============================================================
--
-- FIXES APPLIED:
-- 1. Added missing columns: notes/note_color on both submission tables,
--    leetcode_profile on applications, utm_* on user_sessions
-- 2. Created missing user_workspaces table (workspace/sync was 500ing)
-- 3. Fixed user_id type mismatches: int4 → int8 on 4 tables
-- 4. Fixed ON DELETE behavior: CASCADE for user-owned data, SET NULL for audit
-- 5. Fixed broken RLS policies: daily_solves, user_streaks (impossible UUID cast),
--    news_reactions (CURRENT_USER), user_sessions (too permissive UPDATE/INSERT),
--    notifications (int cast)
-- 6. Added updated_at triggers to 11 tables that had the column but no trigger
--
-- See DATABASE_FULL_QUERY_AUDIT.md for the complete analysis.
-- ============================================================

-- Part 1: Add missing columns and tables
ALTER TABLE training_submissions ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE training_submissions ADD COLUMN IF NOT EXISTS note_color varchar(20);
ALTER TABLE cf_submissions ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE cf_submissions ADD COLUMN IF NOT EXISTS note_color varchar(20);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS leetcode_profile text;
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS utm_source varchar(100);
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS utm_medium varchar(100);
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS utm_campaign varchar(100);

CREATE TABLE IF NOT EXISTS user_workspaces (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    problem_id varchar(100) NOT NULL,
    saved_code jsonb,
    selected_language varchar(50),
    custom_test_cases jsonb,
    whiteboard_data jsonb,
    ai_chat_messages jsonb,
    ai_chat_tabs jsonb,
    ai_chat_concepts jsonb,
    ai_chat_inputs jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(user_id, problem_id)
);
ALTER TABLE user_workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own workspaces" ON user_workspaces FOR SELECT USING ((select auth.uid()) = (SELECT supabase_uid FROM users WHERE id = user_workspaces.user_id));
CREATE POLICY "Users can insert own workspaces" ON user_workspaces FOR INSERT WITH CHECK ((select auth.uid()) = (SELECT supabase_uid FROM users WHERE id = user_workspaces.user_id));
CREATE POLICY "Users can update own workspaces" ON user_workspaces FOR UPDATE USING ((select auth.uid()) = (SELECT supabase_uid FROM users WHERE id = user_workspaces.user_id));
CREATE POLICY "service_role_all_workspaces" ON user_workspaces FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_user_workspaces_user ON user_workspaces(user_id);

-- Part 2: Fix user_id type mismatches (int4 → int8)
-- Must drop dependent policies first, then recreate

DROP POLICY IF EXISTS "Allow users to insert own reactions" ON news_reactions;
DROP POLICY IF EXISTS "Allow users to delete own reactions" ON news_reactions;
DROP POLICY IF EXISTS "Allow authenticated read" ON news_reactions;
ALTER TABLE news_reactions ALTER COLUMN user_id TYPE bigint;
CREATE POLICY "Allow authenticated read" ON news_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow users to insert own reactions" ON news_reactions FOR INSERT WITH CHECK ((select auth.uid()) = (SELECT supabase_uid FROM users WHERE id = news_reactions.user_id));
CREATE POLICY "Allow users to delete own reactions" ON news_reactions FOR DELETE USING ((select auth.uid()) = (SELECT supabase_uid FROM users WHERE id = news_reactions.user_id));

DROP POLICY IF EXISTS "notifications_read_own" ON notifications;
ALTER TABLE notifications ALTER COLUMN user_id TYPE bigint;
CREATE POLICY "notifications_read_own" ON notifications FOR SELECT USING ((select auth.uid()) = (SELECT supabase_uid FROM users WHERE id = notifications.user_id));

DROP POLICY IF EXISTS "Users can insert own notes" ON user_notes;
DROP POLICY IF EXISTS "Users can read own notes" ON user_notes;
DROP POLICY IF EXISTS "Users can update own notes" ON user_notes;
ALTER TABLE user_notes ALTER COLUMN user_id TYPE bigint;
CREATE POLICY "Users can read own notes" ON user_notes FOR SELECT USING ((select auth.uid()) = (SELECT supabase_uid FROM users WHERE id = user_notes.user_id));
CREATE POLICY "Users can insert own notes" ON user_notes FOR INSERT WITH CHECK ((select auth.uid()) = (SELECT supabase_uid FROM users WHERE id = user_notes.user_id));
CREATE POLICY "Users can update own notes" ON user_notes FOR UPDATE USING ((select auth.uid()) = (SELECT supabase_uid FROM users WHERE id = user_notes.user_id));

DROP POLICY IF EXISTS "leaderboard_rank1_history_read_all" ON leaderboard_rank1_history;
DROP POLICY IF EXISTS "leaderboard_rank1_history_service_role_all" ON leaderboard_rank1_history;
ALTER TABLE leaderboard_rank1_history ALTER COLUMN user_id TYPE bigint;
ALTER TABLE leaderboard_rank1_history ALTER COLUMN previous_user_id TYPE bigint;
CREATE POLICY "leaderboard_rank1_history_read_all" ON leaderboard_rank1_history FOR SELECT USING (true);
CREATE POLICY "leaderboard_rank1_history_service_role_all" ON leaderboard_rank1_history FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Part 3: Fix ON DELETE behavior
ALTER TABLE cf_submissions DROP CONSTRAINT cf_submissions_user_id_fkey, ADD CONSTRAINT cf_submissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE training_submissions DROP CONSTRAINT training_submissions_user_id_fkey, ADD CONSTRAINT training_submissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE daily_solves DROP CONSTRAINT daily_solves_user_id_fkey, ADD CONSTRAINT daily_solves_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE user_code DROP CONSTRAINT user_code_user_id_fkey, ADD CONSTRAINT user_code_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE user_custom_tests DROP CONSTRAINT user_custom_tests_user_id_fkey, ADD CONSTRAINT user_custom_tests_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE user_preferences DROP CONSTRAINT user_preferences_user_id_fkey, ADD CONSTRAINT user_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE user_streaks DROP CONSTRAINT user_streaks_user_id_fkey, ADD CONSTRAINT user_streaks_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE user_sessions DROP CONSTRAINT user_sessions_user_id_fkey, ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE user_activity ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE user_activity DROP CONSTRAINT user_activity_user_id_fkey, ADD CONSTRAINT user_activity_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE page_navigation ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE page_navigation DROP CONSTRAINT page_navigation_user_id_fkey, ADD CONSTRAINT page_navigation_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE error_logs DROP CONSTRAINT error_logs_user_id_fkey, ADD CONSTRAINT error_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE leaderboard_rank1_history ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE leaderboard_rank1_history DROP CONSTRAINT leaderboard_rank1_history_user_id_fkey, ADD CONSTRAINT leaderboard_rank1_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE leaderboard_rank1_history DROP CONSTRAINT leaderboard_rank1_history_previous_user_id_fkey, ADD CONSTRAINT leaderboard_rank1_history_previous_user_id_fkey FOREIGN KEY (previous_user_id) REFERENCES users(id) ON DELETE SET NULL;

-- Part 4: Fix broken RLS policies + add updated_at triggers
DROP POLICY IF EXISTS "read_own_daily_solves" ON daily_solves;
CREATE POLICY "read_own_daily_solves" ON daily_solves FOR SELECT USING ((select auth.uid()) = (SELECT supabase_uid FROM users WHERE id = daily_solves.user_id));

DROP POLICY IF EXISTS "read_own_user_streaks" ON user_streaks;
CREATE POLICY "read_own_user_streaks" ON user_streaks FOR SELECT USING ((select auth.uid()) = (SELECT supabase_uid FROM users WHERE id = user_streaks.user_id));

DROP POLICY IF EXISTS "Authenticated can update sessions" ON user_sessions;
CREATE POLICY "Users can update own sessions" ON user_sessions FOR UPDATE USING ((select auth.uid()) = (SELECT supabase_uid FROM users WHERE id = user_sessions.user_id));

DROP POLICY IF EXISTS "Authenticated can insert sessions" ON user_sessions;
CREATE POLICY "Users can insert own sessions" ON user_sessions FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER SECURITY DEFINER SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DO $$ DECLARE tbl TEXT; BEGIN
    FOR tbl IN SELECT unnest(ARRAY['user_code','user_notes','user_preferences','daily_solves','user_streaks','video_ratings','curriculum_sheets','curriculum_levels','user_custom_tests','recap_2025','user_workspaces']) LOOP
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=tbl AND column_name='updated_at') THEN
            EXECUTE format('DROP TRIGGER IF EXISTS update_%s_updated_at ON %I', tbl, tbl);
            EXECUTE format('CREATE TRIGGER update_%s_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', tbl, tbl);
        END IF;
    END LOOP;
END; $$;
