-- ============================================================
-- Migration 004: CF Submissions Table + Performance Indexes
-- For Supabase (PostgreSQL) — run in SQL Editor
-- ============================================================

-- 1. Create cf_submissions table
--    Stores every Codeforces submission with verdict.
--    CF verdicts are the authority for achievements & leaderboard.
CREATE TABLE IF NOT EXISTS public.cf_submissions (
    id          bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    user_id     bigint NOT NULL,
    cf_submission_id bigint NOT NULL,           -- Codeforces submission ID (e.g., 362117318)
    contest_id  varchar NOT NULL,               -- Codeforces contest ID
    problem_index varchar NOT NULL,             -- Problem letter (A, B, C, ...)
    sheet_id    varchar,                        -- Curriculum sheet ID (nullable — links to our curriculum)
    verdict     varchar NOT NULL,               -- 'Accepted', 'Wrong Answer', 'Compilation Error', etc.
    time_ms     integer DEFAULT 0,
    memory_kb   integer DEFAULT 0,
    language    varchar,
    source_code text,                           -- Code from editor at submission time
    cf_handle   varchar,                        -- Codeforces handle
    url_type    varchar DEFAULT 'contest',       -- contest, gym, group, problemset
    group_id    varchar,                        -- For group contests
    submitted_at timestamptz DEFAULT now(),
    CONSTRAINT cf_submissions_pkey PRIMARY KEY (id),
    CONSTRAINT cf_submissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
    CONSTRAINT cf_submissions_cf_id_unique UNIQUE (cf_submission_id)
);

-- 2. Indexes for cf_submissions (optimized for 10k+ concurrent users)
CREATE INDEX IF NOT EXISTS idx_cf_sub_user_id           ON public.cf_submissions (user_id);
CREATE INDEX IF NOT EXISTS idx_cf_sub_user_contest      ON public.cf_submissions (user_id, contest_id, problem_index);
CREATE INDEX IF NOT EXISTS idx_cf_sub_verdict           ON public.cf_submissions (verdict);
CREATE INDEX IF NOT EXISTS idx_cf_sub_submitted_at      ON public.cf_submissions (submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_cf_sub_sheet_verdict     ON public.cf_submissions (sheet_id, verdict) WHERE sheet_id IS NOT NULL;

-- 3. Indexes on user_progress for leaderboard + achievements
CREATE INDEX IF NOT EXISTS idx_user_progress_user_status  ON public.user_progress (user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_progress_sheet_status ON public.user_progress (sheet_id, status) WHERE sheet_id IS NOT NULL;

-- 4. Enable RLS with proper service_role-only policies
ALTER TABLE public.cf_submissions ENABLE ROW LEVEL SECURITY;

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

ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

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

-- ============================================================
-- DONE. Run this in Supabase SQL Editor.
-- ============================================================
