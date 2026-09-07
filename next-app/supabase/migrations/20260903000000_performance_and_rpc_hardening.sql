-- Keep the checked-in Supabase migration history aligned with
-- ../../migrations/027_performance_and_rpc_hardening.sql.

REVOKE EXECUTE ON FUNCTION public.update_solve_stats_on_submission_batch()
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_solve_stats_on_submission_batch()
    TO postgres, service_role;

DROP INDEX IF EXISTS public.idx_apps_student_id;
DROP INDEX IF EXISTS public.idx_users_cf_handle;
DROP INDEX IF EXISTS public.user_solve_stats_season_user_uidx;
