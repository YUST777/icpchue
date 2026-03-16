import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
    try {
        const admin = await verifyAdmin(req);
        if (!admin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const result = await query(`
            WITH unified AS (
                SELECT sheet_id::text AS sheet_id, sheet_id::text || '-' || problem_id AS prob_key, user_id, time_to_solve_seconds
                FROM training_submissions WHERE verdict = 'Accepted' AND sheet_id IS NOT NULL
                UNION ALL
                SELECT sheet_id, sheet_id || '-' || problem_index AS prob_key, user_id, NULL::int
                FROM cf_submissions WHERE verdict = 'Accepted' AND sheet_id IS NOT NULL
            ),
            per_user AS (
                SELECT sheet_id, user_id, COUNT(DISTINCT prob_key) AS user_solved
                FROM unified
                GROUP BY sheet_id, user_id
            ),
            stats AS (
                SELECT sheet_id,
                    COUNT(DISTINCT user_id) AS users_solved,
                    COUNT(*) AS total_solves,
                    COUNT(DISTINCT prob_key) AS unique_problems_solved,
                    AVG(NULLIF(time_to_solve_seconds, 0))::int AS avg_time_seconds
                FROM unified
                GROUP BY sheet_id
            ),
            completions AS (
                SELECT pu.sheet_id, COUNT(*) AS full_completions
                FROM per_user pu
                JOIN curriculum_sheets cs ON cs.id::text = pu.sheet_id
                WHERE pu.user_solved >= cs.total_problems AND cs.total_problems > 0
                GROUP BY pu.sheet_id
            )
            SELECT s.id, s.name, s.slug, s.total_problems, l.name AS level_name, l.slug AS level_slug,
                COALESCE(st.users_solved, 0)::int AS users_solved,
                COALESCE(st.total_solves, 0)::int AS total_solves,
                COALESCE(st.unique_problems_solved, 0)::int AS unique_problems_solved,
                st.avg_time_seconds,
                COALESCE(comp.full_completions, 0)::int AS full_completions
            FROM curriculum_sheets s
            JOIN curriculum_levels l ON l.id = s.level_id
            LEFT JOIN stats st ON st.sheet_id = s.id::text
            LEFT JOIN completions comp ON comp.sheet_id = s.id::text
            ORDER BY l.level_number, s.sheet_number
        `);

        // Also get total user count for context
        const totalUsersRes = await query('SELECT COUNT(*)::int AS c FROM users');
        const totalUsers = totalUsersRes.rows[0]?.c ?? 0;

        const sheets = result.rows.map((r: Record<string, unknown>) => {
            const totalProbs = (r.total_problems as number) ?? 0;
            const uniqueSolved = (r.unique_problems_solved as number) ?? 0;
            const completionRate = totalProbs > 0
                ? ((uniqueSolved / totalProbs) * 100).toFixed(1)
                : null;
            return {
                id: r.id,
                name: r.name,
                slug: r.slug,
                totalProblems: totalProbs,
                levelName: r.level_name,
                levelSlug: r.level_slug,
                usersSolved: r.users_solved ?? 0,
                totalSolves: r.total_solves ?? 0,
                uniqueProblemsSolved: uniqueSolved,
                avgTimeSeconds: r.avg_time_seconds,
                completionRate: completionRate ? `${completionRate}%` : '-',
                fullCompletions: r.full_completions ?? 0
            };
        });

        return NextResponse.json({ success: true, sheets, totalUsers });
    } catch (error) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
