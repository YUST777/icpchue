-- Mentor WhatsApp groups and who belongs to each, shown to trainees on
-- /mentorwhatsapp (each trainee only ever sees their own group and link).
-- Trainees not yet assigned are placed on first visit into the group with
-- the fewest members (random among ties), up to each group's capacity.
-- Server-only: RLS on, no policies, no anon/authenticated grants.

CREATE TABLE IF NOT EXISTS public.mentor_groups (
    id serial PRIMARY KEY,
    season integer NOT NULL,
    name text NOT NULL,
    mentor_name text,
    invite_link text NOT NULL,
    capacity integer NOT NULL DEFAULT 20,
    sort_order integer NOT NULL DEFAULT 0,
    UNIQUE (season, name)
);

CREATE TABLE IF NOT EXISTS public.mentor_group_members (
    id bigserial PRIMARY KEY,
    season integer NOT NULL,
    student_id text NOT NULL,
    group_id integer NOT NULL REFERENCES public.mentor_groups(id) ON DELETE CASCADE,
    source text NOT NULL DEFAULT 'auto', -- 'split' (initial WhatsApp split) or 'auto' (assigned on visit)
    assigned_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (season, student_id)
);

CREATE INDEX IF NOT EXISTS mentor_group_members_group_idx ON public.mentor_group_members (group_id);

ALTER TABLE public.mentor_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_group_members ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mentor_groups FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.mentor_group_members FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.mentor_groups_id_seq FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.mentor_group_members_id_seq FROM PUBLIC, anon, authenticated;
