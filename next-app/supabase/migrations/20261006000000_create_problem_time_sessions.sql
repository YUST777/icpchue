-- Time a trainee spends on each problem, one row per visit (page open).
-- The problem page sends deltas every 30s: active (tab visible and recent
-- input), idle (tab visible, no input), and away (tab hidden). Mentors use it
-- to see where a trainee struggles.
-- Server-only: RLS on, no policies, no anon/authenticated grants.

CREATE TABLE IF NOT EXISTS public.problem_time_sessions (
    id bigserial PRIMARY KEY,
    user_id bigint NOT NULL,
    visit_id uuid NOT NULL,
    contest_id text NOT NULL,
    problem_index text NOT NULL,
    sheet_id text,
    started_at timestamptz NOT NULL DEFAULT now(),
    last_beat_at timestamptz NOT NULL DEFAULT now(),
    active_seconds integer NOT NULL DEFAULT 0,
    idle_seconds integer NOT NULL DEFAULT 0,
    away_seconds integer NOT NULL DEFAULT 0,
    UNIQUE (user_id, visit_id)
);

CREATE INDEX IF NOT EXISTS problem_time_sessions_user_problem_idx
    ON public.problem_time_sessions (user_id, contest_id, problem_index);
CREATE INDEX IF NOT EXISTS problem_time_sessions_user_started_idx
    ON public.problem_time_sessions (user_id, started_at DESC);

ALTER TABLE public.problem_time_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.problem_time_sessions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.problem_time_sessions_id_seq FROM PUBLIC, anon, authenticated;
