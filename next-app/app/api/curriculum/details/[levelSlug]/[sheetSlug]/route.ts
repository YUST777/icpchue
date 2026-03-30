import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/db';
import { verifyAuth } from '@/lib/auth/auth';
import { getCachedData } from '@/lib/cache/cache';

/**
 * GET /api/curriculum/details/[levelSlug]/[sheetSlug]
 * Returns sheet info and all problems for a given level and sheet slug.
 * 2 DB queries total: 1 for sheet info, 1 for problems+solvedCounts+userProgress (single CTE).
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ levelSlug: string, sheetSlug: string }> }
) {
    try {
        const { levelSlug, sheetSlug } = await params;
        const user = await verifyAuth(req);
        const userId = user?.id ?? 'guest';

        const cacheKey = `user:${userId}:details:${levelSlug}:${sheetSlug}`;
        const data = await getCachedData(cacheKey, 300, async () => {
            // Query 1: Sheet info with level info
            const sheetResult = await query(`
                SELECT 
                    s.id as sheet_id, s.sheet_letter, s.sheet_number,
                    s.name as sheet_name, s.slug as sheet_slug,
                    s.description as sheet_description,
                    s.contest_id, s.contest_url, s.total_problems,
                    l.id as level_id, l.level_number, l.name as level_name, l.slug as level_slug
                FROM curriculum_sheets s
                JOIN curriculum_levels l ON s.level_id = l.id
                WHERE l.slug = $1 AND s.slug = $2
            `, [levelSlug, sheetSlug]);

            if (sheetResult.rows.length === 0) {
                return null;
            }

            const sheetInfo = sheetResult.rows[0];

            // Query 2: Problems + solved counts + user progress in ONE query using CTEs
            const problemsResult = await query(`
                WITH solver_counts AS (
                    SELECT problem_letter, COUNT(DISTINCT solver_id) AS solved_count
                    FROM (
                        SELECT ts.problem_id AS problem_letter, ts.user_id AS solver_id
                        FROM training_submissions ts
                        WHERE ts.sheet_id = $4 AND ts.verdict = 'Accepted'
                        UNION
                        SELECT cf.problem_index AS problem_letter, cf.user_id AS solver_id
                        FROM cf_submissions cf
                        WHERE cf.contest_id = $3 AND cf.verdict = 'Accepted'
                    ) AS all_solvers
                    GROUP BY problem_letter
                )
                SELECT 
                    p.id, p.problem_number, p.problem_letter, p.title, p.codeforces_url,
                    COALESCE(sc.solved_count, 0) AS solved_count,
                    up.status AS user_status
                FROM curriculum_problems p
                LEFT JOIN solver_counts sc ON sc.problem_letter = p.problem_letter
                LEFT JOIN user_progress up 
                    ON up.user_id = $2 AND up.problem_id = ($3 || ':' || p.problem_letter)
                WHERE p.sheet_id = $1
                ORDER BY p.problem_number ASC
            `, [sheetInfo.sheet_id, user?.id ?? -1, sheetInfo.contest_id, String(sheetInfo.sheet_id)]);

            return {
                level: {
                    id: sheetInfo.level_id,
                    levelNumber: sheetInfo.level_number,
                    name: sheetInfo.level_name,
                    slug: sheetInfo.level_slug
                },
                sheet: {
                    id: sheetInfo.sheet_id,
                    letter: sheetInfo.sheet_letter,
                    number: sheetInfo.sheet_number,
                    name: sheetInfo.sheet_name,
                    slug: sheetInfo.sheet_slug,
                    description: sheetInfo.sheet_description,
                    contestId: sheetInfo.contest_id,
                    contestUrl: sheetInfo.contest_url,
                    totalProblems: sheetInfo.total_problems
                },
                problems: problemsResult.rows.map(problem => ({
                    id: problem.id,
                    number: problem.problem_number,
                    letter: problem.problem_letter,
                    title: problem.title,
                    codeforcesUrl: problem.codeforces_url,
                    solvedCount: parseInt(problem.solved_count) || 0,
                    userStatus: problem.user_status || null
                }))
            };
        });

        if (!data) {
            return NextResponse.json({ error: 'Sheet not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            ...data
        });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch curriculum details' }, { status: 500 });
    }
}

