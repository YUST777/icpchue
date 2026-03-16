-- Migration: Create Curriculum Schema
-- Description: Levels, sheets, problems tables + RLS + seed levels
-- Date: 2026-02-08

CREATE TABLE IF NOT EXISTS public.curriculum_levels (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    level_number integer NOT NULL UNIQUE,
    name varchar(100) NOT NULL,
    slug varchar(50) NOT NULL UNIQUE,
    description text,
    duration_weeks integer,
    total_problems integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.curriculum_sheets (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    level_id bigint NOT NULL REFERENCES public.curriculum_levels(id) ON DELETE CASCADE,
    sheet_letter varchar(10) NOT NULL,
    sheet_number integer NOT NULL,
    name varchar(200) NOT NULL,
    slug varchar(50) NOT NULL,
    description text,
    contest_id varchar(50),
    contest_url text,
    total_problems integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(level_id, sheet_letter),
    UNIQUE(level_id, sheet_number)
);

CREATE TABLE IF NOT EXISTS public.curriculum_problems (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sheet_id bigint NOT NULL REFERENCES public.curriculum_sheets(id) ON DELETE CASCADE,
    problem_number integer NOT NULL,
    problem_letter varchar(5) NOT NULL,
    title varchar(300) NOT NULL,
    codeforces_url text NOT NULL,
    difficulty varchar(50),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(sheet_id, problem_letter),
    UNIQUE(sheet_id, problem_number)
);

CREATE INDEX IF NOT EXISTS idx_curriculum_sheets_level_id ON public.curriculum_sheets(level_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_sheets_slug ON public.curriculum_sheets(slug);
CREATE INDEX IF NOT EXISTS idx_curriculum_problems_sheet_id ON public.curriculum_problems(sheet_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_problems_letter ON public.curriculum_problems(problem_letter);

ALTER TABLE public.curriculum_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_problems ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for curriculum_levels"
    ON public.curriculum_levels FOR SELECT
    USING (true);

CREATE POLICY "Public read access for curriculum_sheets"
    ON public.curriculum_sheets FOR SELECT
    USING (true);

CREATE POLICY "Public read access for curriculum_problems"
    ON public.curriculum_problems FOR SELECT
    USING (true);

CREATE POLICY "Admin write access for curriculum_levels"
    ON public.curriculum_levels FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id::text = auth.uid()::text
            AND users.role IN ('owner', 'instructor')
        )
    );

CREATE POLICY "Admin write access for curriculum_sheets"
    ON public.curriculum_sheets FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id::text = auth.uid()::text
            AND users.role IN ('owner', 'instructor')
        )
    );

CREATE POLICY "Admin write access for curriculum_problems"
    ON public.curriculum_problems FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id::text = auth.uid()::text
            AND users.role IN ('owner', 'instructor')
        )
    );

INSERT INTO public.curriculum_levels (level_number, name, slug, description, duration_weeks, total_problems)
VALUES
    (0, 'Level 0: Newcomers Training', 'level0', 'Complete beginner training covering fundamentals: data types, loops, arrays, strings, functions, math, recursion, and general problem-solving.', 6, 249),
    (1, 'Level 1: Intermediate Training', 'level1', 'Intermediate training covering STL, sorting, binary search, two pointers, bitmask, and number theory.', 8, 0),
    (2, 'Level 2: Advanced Training', 'level2', 'Advanced training covering graphs, shortest paths, trees, DSU, MST, and dynamic programming.', 10, 0),
    (3, 'Level 3: Expert Training', 'level3', 'Expert training covering segment trees, advanced DP, string algorithms, and flow.', 12, 0)
ON CONFLICT (level_number) DO NOTHING;
