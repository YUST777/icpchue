-- user_activity, user_sessions and error_logs were moved to the archive
-- schema around 2026-05-31, but /api/track and /api/track/navigation still
-- write to public.*, and the failures were swallowed. Nothing was recorded
-- for four months. Move them back with their data.
-- Server-only: RLS on, no policies, no anon/authenticated grants.

DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['user_activity', 'user_sessions', 'error_logs'] LOOP
        IF to_regclass('archive.' || t) IS NOT NULL AND to_regclass('public.' || t) IS NULL THEN
            EXECUTE format('ALTER TABLE archive.%I SET SCHEMA public', t);
        END IF;
        IF to_regclass('public.' || t) IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
            EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', t);
        END IF;
    END LOOP;
END;
$$;
