-- Social handles a member shows on their public profile, e.g.
-- {"github": "name", "linkedin": "name"}. Validated by lib/profile/socials.ts.
-- users is already server-only (RLS on, no anon/authenticated grants).

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS social_links jsonb NOT NULL DEFAULT '{}'::jsonb;
