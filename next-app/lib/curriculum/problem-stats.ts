import { query } from '@/lib/db/db';

/**
 * Real difficulty for curriculum problems, from our own trainees. Group
 * contest problems have no Codeforces rating, so the old stored numbers were
 * guesses (e.g. 2700 on a Level 0 problem).
 *
 * tried  = submitted, has progress, or spent 60s+ active time on it
 * solved = has an Accepted / SOLVED progress
 * median_solve_seconds = median active time before the first Accepted
 * Staff accounts are excluded.
 */
export interface ProblemStats {
    tried: number;
    solved: number;
    solveRate: number;              // 0..100
    medianSolveSeconds: number | null;
}

// Below this many trainees a percentage says more about noise than difficulty.
export const MIN_TRIED_FOR_STATS = 5;
const MIN_TIMED_FOR_MEDIAN = 3;
const CACHE_TTL_MS = 10 * 60 * 1000;

const cache = new Map<string, { at: number; data: Map<string, ProblemStats> }>();

export async function getContestProblemStats(contestId: string): Promise<Map<string, ProblemStats>> {
    const hit = cache.get(contestId);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data;

    const { rows } = await query(`
        WITH staff AS (SELECT id FROM users WHERE role IN ('mentor', 'instructor', 'owner')),
        tried AS (
            SELECT user_id, UPPER(split_part(problem_id, ':', 2)) AS letter
              FROM user_progress
             WHERE split_part(problem_id, ':', 1) = $1 AND status IN ('SOLVED', 'ATTEMPTED')
            UNION
            SELECT user_id, UPPER(TRIM(problem_index)) FROM submissions WHERE contest_id::text = $1
            UNION
            SELECT user_id, problem_index FROM problem_time_sessions WHERE contest_id = $1 AND active_seconds >= 60
        ),
        solved AS (
            SELECT user_id, UPPER(split_part(problem_id, ':', 2)) AS letter
              FROM user_progress
             WHERE split_part(problem_id, ':', 1) = $1 AND status = 'SOLVED'
            UNION
            SELECT user_id, UPPER(TRIM(problem_index)) FROM submissions
             WHERE contest_id::text = $1 AND (verdict ILIKE '%accepted%' OR LOWER(verdict) IN ('ok', 'ac'))
        ),
        first_ac AS (
            SELECT user_id, UPPER(TRIM(problem_index)) AS letter, MIN(submitted_at) AS ac_at
              FROM submissions
             WHERE contest_id::text = $1 AND (verdict ILIKE '%accepted%' OR LOWER(verdict) IN ('ok', 'ac'))
             GROUP BY 1, 2
        ),
        solve_time AS (
            SELECT t.user_id, t.problem_index AS letter, SUM(t.active_seconds) AS secs
              FROM problem_time_sessions t
              JOIN first_ac f ON f.user_id = t.user_id AND f.letter = t.problem_index
             WHERE t.contest_id = $1 AND t.started_at <= f.ac_at
               AND t.user_id NOT IN (SELECT id FROM staff)
             GROUP BY 1, 2
        )
        SELECT tr.letter,
               COUNT(DISTINCT tr.user_id)::int AS tried,
               COUNT(DISTINCT s.user_id)::int AS solved,
               (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY st.secs) FROM solve_time st WHERE st.letter = tr.letter) AS median_secs,
               (SELECT COUNT(*) FROM solve_time st WHERE st.letter = tr.letter)::int AS timed
          FROM tried tr
          LEFT JOIN solved s ON s.user_id = tr.user_id AND s.letter = tr.letter
         WHERE tr.user_id NOT IN (SELECT id FROM staff)
         GROUP BY tr.letter
    `, [contestId]);

    const data = new Map<string, ProblemStats>();
    for (const r of rows) {
        if (!r.letter || r.tried < MIN_TRIED_FOR_STATS) continue;
        data.set(String(r.letter), {
            tried: r.tried,
            solved: r.solved,
            solveRate: Math.round((r.solved / r.tried) * 100),
            medianSolveSeconds: r.timed >= MIN_TIMED_FOR_MEDIAN && r.median_secs != null ? Math.round(Number(r.median_secs)) : null,
        });
    }
    cache.set(contestId, { at: Date.now(), data });
    return data;
}
