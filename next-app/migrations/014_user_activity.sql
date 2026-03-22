-- ============================================================
-- Migration 014: User Activity Tracking
-- Records every meaningful user action for analytics
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_activity (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     bigint NOT NULL REFERENCES public.users(id),
    action      varchar(50) NOT NULL,
    contest_id  varchar,
    problem_id  varchar,
    sheet_id    varchar,
    metadata    jsonb DEFAULT '{}',
    ip_address  text,
    user_agent  text,
    created_at  timestamptz DEFAULT now()
);

-- Actions tracked:
--   problem_view      - User opened a problem page
--   tab_switch        - User switched tabs (description/submissions/analytics/solution)
--   code_run          - User ran tests locally
--   code_submit       - User submitted to Codeforces
--   submission_view   - User viewed a submission detail
--   solution_view     - User viewed the solution tab
--   notes_open        - User opened notes panel
--   notes_save        - User saved a note
--   whiteboard_open   - User opened whiteboard
--   settings_open     - User opened settings
--   language_change   - User changed programming language
--   drawer_open       - User opened problem drawer
--   handle_save       - User saved CF handle
--   code_copy         - User copied code
--   code_paste        - User pasted code
--   fullscreen_toggle - User toggled fullscreen
--   keyboard_shortcut - User used a keyboard shortcut

CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON public.user_activity (user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_action ON public.user_activity (action);
CREATE INDEX IF NOT EXISTS idx_user_activity_user_action ON public.user_activity (user_id, action);
CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON public.user_activity (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_contest_problem ON public.user_activity (contest_id, problem_id) WHERE contest_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_activity_user_time ON public.user_activity (user_id, created_at DESC);
