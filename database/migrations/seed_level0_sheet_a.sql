-- Seed: Level 0 - Sheet A (Data Types & Conditions)
-- Source: scrape/icpchue-curriculum/level-0-problems.md
-- Date: 2026-02-08

WITH level AS (
    SELECT id
    FROM public.curriculum_levels
    WHERE slug = 'level0'
),
sheet AS (
    INSERT INTO public.curriculum_sheets (
        level_id,
        sheet_letter,
        sheet_number,
        name,
        slug,
        description,
        contest_id,
        contest_url,
        total_problems
    )
    SELECT
        level.id,
        'A',
        1,
        'Data Types & Conditions',
        'sheet-a',
        'Learn how to store data in variables, work with different data types, and make decisions using if-else statements.',
        '219158',
        'https://codeforces.com/group/MWSDmqGsZm/contest/219158',
        26
    FROM level
    ON CONFLICT (level_id, sheet_letter)
    DO UPDATE SET
        sheet_number = EXCLUDED.sheet_number,
        name = EXCLUDED.name,
        slug = EXCLUDED.slug,
        description = EXCLUDED.description,
        contest_id = EXCLUDED.contest_id,
        contest_url = EXCLUDED.contest_url,
        total_problems = EXCLUDED.total_problems
    RETURNING id
)
INSERT INTO public.curriculum_problems (
    sheet_id,
    problem_number,
    problem_letter,
    title,
    codeforces_url
)
SELECT sheet.id, v.problem_number, v.problem_letter, v.title, v.codeforces_url
FROM sheet
JOIN (
    VALUES
        (1, 'A', 'Say Hello With C++', 'https://codeforces.com/group/MWSDmqGsZm/contest/219158/problem/A'),
        (2, 'B', 'Basic Data Types', 'https://codeforces.com/group/MWSDmqGsZm/contest/219158/problem/B'),
        (3, 'C', 'Simple Calculator', 'https://codeforces.com/group/MWSDmqGsZm/contest/219158/problem/C'),
        (4, 'D', 'Difference', 'https://codeforces.com/group/MWSDmqGsZm/contest/219158/problem/D'),
        (5, 'E', 'Area of a Circle', 'https://codeforces.com/group/MWSDmqGsZm/contest/219158/problem/E'),
        (6, 'F', 'Digits Summation', 'https://codeforces.com/group/MWSDmqGsZm/contest/219158/problem/F'),
        (7, 'G', 'Summation from 1 to N', 'https://codeforces.com/group/MWSDmqGsZm/contest/219158/problem/G'),
        (8, 'H', 'Two numbers', 'https://codeforces.com/group/MWSDmqGsZm/contest/219158/problem/H'),
        (9, 'I', 'Welcome for you with Condition', 'https://codeforces.com/group/MWSDmqGsZm/contest/219158/problem/I'),
        (10, 'J', 'Multiples', 'https://codeforces.com/group/MWSDmqGsZm/contest/219158/problem/J'),
        (11, 'K', 'Max and Min', 'https://codeforces.com/group/MWSDmqGsZm/contest/219158/problem/K'),
        (12, 'L', 'The Brothers', 'https://codeforces.com/group/MWSDmqGsZm/contest/219158/problem/L'),
        (13, 'M', 'Capital or Small or Digit', 'https://codeforces.com/group/MWSDmqGsZm/contest/219158/problem/M'),
        (14, 'N', 'Char', 'https://codeforces.com/group/MWSDmqGsZm/contest/219158/problem/N'),
        (15, 'O', 'Calculator', 'https://codeforces.com/group/MWSDmqGsZm/contest/219158/problem/O'),
        (16, 'P', 'First digit !', 'https://codeforces.com/group/MWSDmqGsZm/contest/219158/problem/P'),
        (17, 'Q', 'Coordinates of a Point', 'https://codeforces.com/group/MWSDmqGsZm/contest/219158/problem/Q'),
        (18, 'R', 'Age in Days', 'https://codeforces.com/group/MWSDmqGsZm/contest/219158/problem/R'),
        (19, 'S', 'Interval', 'https://codeforces.com/group/MWSDmqGsZm/contest/219158/problem/S'),
        (20, 'T', 'Sort Numbers', 'https://codeforces.com/group/MWSDmqGsZm/contest/219158/problem/T'),
        (21, 'U', 'Float or int', 'https://codeforces.com/group/MWSDmqGsZm/contest/219158/problem/U'),
        (22, 'V', 'Comparison', 'https://codeforces.com/group/MWSDmqGsZm/contest/219158/problem/V'),
        (23, 'W', 'Mathematical Expression', 'https://codeforces.com/group/MWSDmqGsZm/contest/219158/problem/W'),
        (24, 'X', 'Two intervals', 'https://codeforces.com/group/MWSDmqGsZm/contest/219158/problem/X'),
        (25, 'Y', 'The last 2 digits', 'https://codeforces.com/group/MWSDmqGsZm/contest/219158/problem/Y'),
        (26, 'Z', 'Hard Compare', 'https://codeforces.com/group/MWSDmqGsZm/contest/219158/problem/Z')
) AS v(problem_number, problem_letter, title, codeforces_url)
ON CONFLICT (sheet_id, problem_letter) DO NOTHING;
