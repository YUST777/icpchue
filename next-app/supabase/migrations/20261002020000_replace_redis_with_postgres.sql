-- Replace Redis with Postgres for rate limiting and short-lived caching.
-- Redis was never reachable from Vercel, so every limiter fell back to a
-- per-instance in-memory counter and every cache read missed.
-- These tables are server-only: the app connects as the database owner.
-- RLS is enabled with no policies and API roles have no grants, so
-- PostgREST cannot read or write them.

CREATE TABLE IF NOT EXISTS public.app_rate_limits (
    key text PRIMARY KEY,
    hit_count integer NOT NULL,
    reset_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS app_rate_limits_reset_at_idx ON public.app_rate_limits (reset_at);

CREATE TABLE IF NOT EXISTS public.app_cache (
    key text PRIMARY KEY,
    value jsonb NOT NULL,
    expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS app_cache_expires_at_idx ON public.app_cache (expires_at);

ALTER TABLE public.app_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_cache ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.app_rate_limits FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.app_cache FROM PUBLIC, anon, authenticated;

-- Atomic fixed-window counter: one round trip, safe under concurrency.
CREATE OR REPLACE FUNCTION public.app_rate_limit_hit(p_key text, p_window_seconds integer)
RETURNS TABLE (hit_count integer, reset_at timestamptz)
LANGUAGE sql
SET search_path = public, pg_temp
AS $$
    INSERT INTO public.app_rate_limits AS r (key, hit_count, reset_at)
    VALUES (p_key, 1, now() + make_interval(secs => p_window_seconds))
    ON CONFLICT (key) DO UPDATE SET
        hit_count = CASE WHEN r.reset_at <= now() THEN 1 ELSE r.hit_count + 1 END,
        reset_at = CASE WHEN r.reset_at <= now()
                        THEN now() + make_interval(secs => p_window_seconds)
                        ELSE r.reset_at END
    RETURNING r.hit_count, r.reset_at;
$$;

REVOKE ALL ON FUNCTION public.app_rate_limit_hit(text, integer) FROM PUBLIC, anon, authenticated;
