-- The discipline program restarts on 24 Oct 2026. Keep the first run (started
-- 8 Sep) in an archive table and clear the live one so everyone starts empty.
CREATE TABLE public.user_discipline_logs_archive_2026_09 (LIKE public.user_discipline_logs);
INSERT INTO public.user_discipline_logs_archive_2026_09 SELECT * FROM public.user_discipline_logs;

ALTER TABLE public.user_discipline_logs_archive_2026_09 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_discipline_logs_archive_2026_09 FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
    IF (SELECT count(*) FROM public.user_discipline_logs_archive_2026_09)
       <> (SELECT count(*) FROM public.user_discipline_logs) THEN
        RAISE EXCEPTION 'archive row count does not match, aborting';
    END IF;
END $$;

DELETE FROM public.user_discipline_logs;
