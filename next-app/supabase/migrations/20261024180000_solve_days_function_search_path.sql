-- Supabase linter 0011: pin search_path on the solve-days functions.
-- Both bodies already schema-qualify every table (public.*), so an empty
-- search_path changes nothing except closing the mutable-path warning.
ALTER FUNCTION public.recompute_solve_days(bigint) SET search_path = '';
ALTER FUNCTION public.recompute_solve_days_trigger() SET search_path = '';
