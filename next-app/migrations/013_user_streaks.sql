-- ============================================================
-- Migration 013: User Daily Solves + Streaks
-- ============================================================

-- 1. Table for daily solve counts
CREATE TABLE IF NOT EXISTS public.daily_solves (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     bigint NOT NULL,
    solve_date  date NOT NULL DEFAULT CURRENT_DATE,
    solve_count integer DEFAULT 0,
    created_at  timestamptz DEFAULT now(),
    updated_at  timestamptz DEFAULT now(),
    CONSTRAINT daily_solves_user_date_unique UNIQUE (user_id, solve_date),
    CONSTRAINT daily_solves_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- 2. Table for current/max streak tracking
CREATE TABLE IF NOT EXISTS public.user_streaks (
    user_id     bigint PRIMARY KEY,
    current_streak integer DEFAULT 0,
    max_streak  integer DEFAULT 0,
    last_solve_date date,
    updated_at  timestamptz DEFAULT now(),
    CONSTRAINT user_streaks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

CREATE INDEX IF NOT EXISTS idx_daily_solves_user_date ON public.daily_solves (user_id, solve_date);

-- Enable RLS
ALTER TABLE public.daily_solves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "service_role_all_daily_solves" ON public.daily_solves FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_user_streaks" ON public.user_streaks FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "read_own_daily_solves" ON public.daily_solves FOR SELECT TO authenticated USING (user_id = (select auth.uid()::text)::bigint);
CREATE POLICY "read_own_user_streaks" ON public.user_streaks FOR SELECT TO authenticated USING (user_id = (select auth.uid()::text)::bigint);
