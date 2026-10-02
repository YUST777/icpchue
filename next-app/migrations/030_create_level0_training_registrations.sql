-- Keep the checked-in SQL migration aligned with
-- ../supabase/migrations/20261002010000_create_level0_training_registrations.sql.

CREATE TABLE IF NOT EXISTS public.level0_training_registrations (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    season_year smallint NOT NULL DEFAULT 2027
        REFERENCES public.seasons(year) ON DELETE RESTRICT,
    training_level text NOT NULL DEFAULT 'level0'
        CHECK (training_level = 'level0'),
    status text NOT NULL DEFAULT 'registered'
        CHECK (status IN ('registered', 'account_created', 'cancelled')),
    name text NOT NULL,
    faculty text NOT NULL,
    student_id text NOT NULL,
    national_id text NOT NULL,
    academic_level text NOT NULL,
    telephone text NOT NULL,
    has_laptop boolean NOT NULL DEFAULT false,
    codeforces_profile text,
    leetcode_profile text,
    email text,
    email_blind_index text,
    national_id_blind_index text,
    telephone_blind_index text,
    student_id_blind_index text,
    application_id bigint REFERENCES public.applications(id) ON DELETE SET NULL,
    ip_address text,
    user_agent text,
    submitted_at timestamptz NOT NULL DEFAULT now(),
    account_created_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS level0_training_2027_student_id_uidx
    ON public.level0_training_registrations (season_year, student_id_blind_index)
    WHERE student_id_blind_index IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS level0_training_2027_national_id_uidx
    ON public.level0_training_registrations (season_year, national_id_blind_index)
    WHERE national_id_blind_index IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS level0_training_2027_telephone_uidx
    ON public.level0_training_registrations (season_year, telephone_blind_index)
    WHERE telephone_blind_index IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS level0_training_2027_email_uidx
    ON public.level0_training_registrations (season_year, email_blind_index)
    WHERE email_blind_index IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS level0_training_2027_application_uidx
    ON public.level0_training_registrations (application_id)
    WHERE application_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS level0_training_2027_status_submitted_idx
    ON public.level0_training_registrations (season_year, status, submitted_at DESC);

ALTER TABLE public.level0_training_registrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS level0_training_service_role_all
    ON public.level0_training_registrations;
CREATE POLICY level0_training_service_role_all
    ON public.level0_training_registrations
    FOR ALL TO service_role USING (true) WITH CHECK (true);
REVOKE ALL ON public.level0_training_registrations FROM anon, authenticated;
GRANT ALL ON public.level0_training_registrations TO service_role;
