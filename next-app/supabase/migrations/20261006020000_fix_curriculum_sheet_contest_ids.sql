-- 21 Level 1 sheets had wrong contest_id / group_id (applied 2026-10-06).
-- Sheets F, G, H pointed at Level 0 Sheet A's contest (219158), so every
-- Level 0 Sheet A solve showed as Level 1 progress, and their problem pages
-- loaded the wrong contest. B-E pointed at other sheets' contests, and J, L
-- and Contest #1-#12 had the wrong Codeforces group. The problems' own
-- codeforces_url values (and each sheet's contest_url) were correct, so the
-- sheets are aligned to them. Idempotent.

WITH truth AS (
    SELECT sheet_id,
           array_agg(DISTINCT substring(codeforces_url from 'contest/(\d+)')) AS cids,
           array_agg(DISTINCT substring(codeforces_url from 'group/([^/]+)')) AS groups
      FROM public.curriculum_problems
     GROUP BY sheet_id
)
UPDATE public.curriculum_sheets s
   SET contest_id = t.cids[1],
       group_id = t.groups[1],
       updated_at = now()
  FROM truth t
 WHERE t.sheet_id = s.id
   AND array_length(t.cids, 1) = 1
   AND array_length(t.groups, 1) = 1
   AND (s.contest_id::text <> t.cids[1] OR COALESCE(s.group_id, '') <> COALESCE(t.groups[1], ''));
