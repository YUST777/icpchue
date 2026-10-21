-- Which trainees each mentor follows on the mentor dashboard. A mentor with
-- rows here sees only those trainees (by Horus student ID, i.e. the part of
-- the trainee's email before @horus.edu.eg); instructors and owners see all.
-- Server-only: RLS on, no policies, no anon/authenticated grants.

CREATE TABLE IF NOT EXISTS public.mentor_trainees (
    id bigserial PRIMARY KEY,
    mentor_user_id bigint NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    student_id text NOT NULL,
    group_name text,
    assigned_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (mentor_user_id, student_id)
);

CREATE INDEX IF NOT EXISTS mentor_trainees_student_idx ON public.mentor_trainees (student_id);

ALTER TABLE public.mentor_trainees ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mentor_trainees FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.mentor_trainees_id_seq FROM PUBLIC, anon, authenticated;
