-- How each trainee consumes a recorded session: one row per (user, session).
-- The session page sends deltas every ~20s while the tab is open:
--   watched_seconds  video actually playing with the tab visible
--   watched_buckets  10-second parts of the video that were played (coverage)
--   page_seconds     time on the session page with the tab visible
--   slides_seen      slide numbers opened in the in-page slide viewer
-- Mentors read it on the trainee page (Sessions tab).
-- Server-only: RLS on, no policies, no anon/authenticated grants.

CREATE TABLE IF NOT EXISTS public.session_watch (
    id bigserial PRIMARY KEY,
    user_id bigint NOT NULL,
    camp_slug text NOT NULL,
    session_slug text NOT NULL,
    video_id text,
    watched_seconds integer NOT NULL DEFAULT 0,
    page_seconds integer NOT NULL DEFAULT 0,
    duration_seconds integer,
    max_position_seconds integer NOT NULL DEFAULT 0,
    watched_buckets integer[] NOT NULL DEFAULT '{}',
    slides_seen integer[] NOT NULL DEFAULT '{}',
    plays integer NOT NULL DEFAULT 0,
    first_seen_at timestamptz NOT NULL DEFAULT now(),
    last_beat_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, camp_slug, session_slug)
);

CREATE INDEX IF NOT EXISTS session_watch_session_idx
    ON public.session_watch (camp_slug, session_slug);

ALTER TABLE public.session_watch ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.session_watch FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.session_watch_id_seq FROM PUBLIC, anon, authenticated;
