-- ============================================================
-- Migration 016: User Code Snapshots & Preferences
-- Moves localStorage data to Postgres for persistence,
-- cheating detection, and cross-device sync.
-- ============================================================

-- 1. User code snapshots — the code a user is writing / has submitted
CREATE TABLE IF NOT EXISTS public.user_code (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     bigint NOT NULL REFERENCES public.users(id),
    contest_id  varchar NOT NULL,
    problem_id  varchar NOT NULL,
    language    varchar(20) NOT NULL DEFAULT 'cpp',
    code        text NOT NULL DEFAULT '',
    is_submitted boolean NOT NULL DEFAULT false,
    updated_at  timestamptz DEFAULT now(),
    created_at  timestamptz DEFAULT now()
);

-- Unique index for working code (one per user+contest+problem+language)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_code_working_uq
    ON public.user_code (user_id, contest_id, problem_id, language)
    WHERE is_submitted = false;

-- For loading user's current code quickly
CREATE INDEX IF NOT EXISTS idx_user_code_lookup
    ON public.user_code (user_id, contest_id, problem_id, language)
    WHERE is_submitted = false;

-- For cheating analysis: all submitted code for a problem
CREATE INDEX IF NOT EXISTS idx_user_code_submitted
    ON public.user_code (contest_id, problem_id, created_at DESC)
    WHERE is_submitted = true;

-- Per-user submission history
CREATE INDEX IF NOT EXISTS idx_user_code_user_submitted
    ON public.user_code (user_id, created_at DESC)
    WHERE is_submitted = true;

-- 2. User preferences — key-value store for all the misc localStorage stuff
CREATE TABLE IF NOT EXISTS public.user_preferences (
    user_id     bigint NOT NULL REFERENCES public.users(id),
    key         varchar(100) NOT NULL,
    value       text NOT NULL DEFAULT '',
    updated_at  timestamptz DEFAULT now(),
    
    PRIMARY KEY (user_id, key)
);

-- 3. User custom test cases — per problem
CREATE TABLE IF NOT EXISTS public.user_custom_tests (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     bigint NOT NULL REFERENCES public.users(id),
    contest_id  varchar NOT NULL,
    problem_id  varchar NOT NULL,
    test_cases  jsonb NOT NULL DEFAULT '[]',
    updated_at  timestamptz DEFAULT now(),
    
    CONSTRAINT uq_user_custom_tests UNIQUE (user_id, contest_id, problem_id)
);
