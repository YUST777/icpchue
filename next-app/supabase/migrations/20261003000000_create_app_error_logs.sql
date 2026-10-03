-- Persistent error log. Vercel only keeps about an hour of runtime logs on
-- this plan, so server errors/warnings, uncaught request errors, and browser
-- errors are stored here for 30 days.
-- Server-only: RLS on, no policies, no anon/authenticated grants.

CREATE TABLE IF NOT EXISTS public.app_error_logs (
    id bigserial PRIMARY KEY,
    created_at timestamptz NOT NULL DEFAULT now(),
    level text NOT NULL,              -- error | warn
    source text NOT NULL,             -- server | request | client
    message text NOT NULL,
    stack text,
    path text,
    method text,
    route text,                       -- Next.js route file / route type
    digest text,
    user_id integer,
    deployment text,
    context jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS app_error_logs_created_at_idx ON public.app_error_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS app_error_logs_path_idx ON public.app_error_logs (path, created_at DESC);

ALTER TABLE public.app_error_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.app_error_logs FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.app_error_logs_id_seq FROM PUBLIC, anon, authenticated;

-- Grouped view for quick triage in the Supabase table editor / SQL editor:
--   select * from public.app_error_summary;
CREATE OR REPLACE VIEW public.app_error_summary
WITH (security_invoker = true) AS
SELECT
    source,
    level,
    coalesce(path, '-') AS path,
    left(regexp_replace(message, '\d{3,}', 'N', 'g'), 200) AS message,
    count(*) AS occurrences,
    count(DISTINCT user_id) AS users,
    min(created_at) AS first_seen,
    max(created_at) AS last_seen
FROM public.app_error_logs
WHERE created_at > now() - interval '7 days'
GROUP BY 1, 2, 3, 4
ORDER BY last_seen DESC;

REVOKE ALL ON public.app_error_summary FROM PUBLIC, anon, authenticated;
