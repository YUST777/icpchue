-- Migration 026: close the remaining direct PostgREST grants found during
-- the production privilege audit. The application uses its server-side
-- database connection for all table access; the browser only uses Supabase
-- Auth, so anon/authenticated need no application-table privileges.

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;

-- Keep future tables/functions private by default too. Service-role and the
-- database owner used by Next.js are unaffected by these grants.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;

-- The archive schema is application-owned and is not needed by the browser.
-- Keep this conditional because fresh environments may not have the archive
-- schema yet.
DO $$
BEGIN
    IF to_regnamespace('archive') IS NOT NULL THEN
        EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA archive FROM anon, authenticated';
        EXECUTE 'REVOKE ALL ON ALL SEQUENCES IN SCHEMA archive FROM anon, authenticated';
        EXECUTE 'REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA archive FROM anon, authenticated';
        EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA archive REVOKE ALL ON TABLES FROM anon, authenticated';
        EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA archive REVOKE ALL ON SEQUENCES FROM anon, authenticated';
        EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA archive REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated';
    END IF;
END;
$$;
