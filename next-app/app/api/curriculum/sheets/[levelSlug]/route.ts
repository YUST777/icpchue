import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/db';
import { verifyAuth } from '@/lib/auth/auth';
import { getCachedData } from '@/lib/cache/cache';

/**
 * GET /api/curriculum/sheets/[levelSlug]
 * Returns all sheets for a given level with per-sheet solved counts.
 * Uses 2 DB queries total: 1 for level, 1 for sheets+progress (single JOIN).
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ levelSlug: string }> }
) {
    try {
        const { levelSlug } = await params;
        const user = await verifyAuth(req);
        const userId = user?.id ?? 'guest';

        const cacheKey = `user:${userId}:sheets:${levelSlug}`;
        const data = await getCachedData(cacheKey, 300, async () => {
            // Query 1: Get level info
            const levelResult = await query(`
                SELECT id, level_number, name, slug, description, duration_weeks, total_problems
                FROM curriculum_levels
                WHERE slug = $1
            `, [levelSlug]);

            if (levelResult.rows.length === 0) {
                return null;
            }

            const level = levelResult.rows[0];

            // Query 2: Get sheets + per-sheet solved count in ONE query
            const sheetsResult = await query(`
                SELECT 
                    s.id,
                    s.sheet_letter,
                    s.sheet_number,
                    s.name,
                    s.slug,
                    s.description,
                    s.contest_id,
                    s.contest_url,
                    s.total_problems,
                    COUNT(DISTINCT CASE 
                        WHEN up.status = 'SOLVED' THEN p.id 
                    END) AS solved_count
                FROM curriculum_sheets s
                LEFT JOIN curriculum_problems p ON p.sheet_id = s.id
                LEFT JOIN user_progress up 
                    ON up.problem_id = (s.contest_id || ':' || p.problem_letter)
                    AND up.user_id = $2
                WHERE s.level_id = $1
                GROUP BY s.id, s.sheet_letter, s.sheet_number, s.name, s.slug, 
                         s.description, s.contest_id, s.contest_url, s.total_problems
                ORDER BY s.sheet_number ASC
            `, [level.id, userId === 'guest' ? -1 : userId]);

            return {
                success: true,
                level: {
                    id: level.id,
                    levelNumber: level.level_number,
                    name: level.name,
                    slug: level.slug,
                    description: level.description,
                    durationWeeks: level.duration_weeks,
                    totalProblems: level.total_problems
                },
                sheets: sheetsResult.rows.map(sheet => ({
                    id: sheet.id,
                    letter: sheet.sheet_letter,
                    number: sheet.sheet_number,
                    name: sheet.name,
                    slug: sheet.slug,
                    description: sheet.description,
                    contestId: sheet.contest_id,
                    contestUrl: sheet.contest_url,
                    totalProblems: parseInt(sheet.total_problems) || 0,
                    solvedCount: parseInt(sheet.solved_count) || 0
                }))
            };
        });

        if (!data) {
            return NextResponse.json({ error: 'Level not found' }, { status: 404 });
        }

        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch curriculum sheets' }, { status: 500 });
    }
}
