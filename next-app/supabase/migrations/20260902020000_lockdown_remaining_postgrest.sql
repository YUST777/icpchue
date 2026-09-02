-- Keep the checked-in Supabase migration history aligned with
-- ../migrations/026_lockdown_remaining_postgrest.sql.

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;

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
