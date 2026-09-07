-- Migration 027: remove redundant indexes and close the trigger helper RPC.
--
-- update_solve_stats_on_submission_batch() is only invoked by PostgreSQL
-- triggers. It must not be callable through PostgREST by browser roles.
REVOKE EXECUTE ON FUNCTION public.update_solve_stats_on_submission_batch()
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_solve_stats_on_submission_batch()
    TO postgres, service_role;

-- These indexes are exact duplicates. Keep the established/constraint-backed
-- index and remove the redundant copy to reduce write amplification and index
-- storage. IF EXISTS keeps this migration safe on older environments.
DROP INDEX IF EXISTS public.idx_apps_student_id;
DROP INDEX IF EXISTS public.idx_users_cf_handle;
DROP INDEX IF EXISTS public.user_solve_stats_season_user_uidx;
