import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/db';

/**
 * GET /api/curriculum/problem/[levelSlug]/[sheetSlug]/[problemLetter]
 * Returns problem details for a given level, sheet, and problem letter
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ levelSlug: string, sheetSlug: string, problemLetter: string }> }
) {
    try {
        const { levelSlug, sheetSlug, problemLetter } = await params;

        // Get problem info with sheet and level info
        const result = await query(`
            SELECT 
                p.id as problem_id,
                p.problem_number,
                p.problem_letter,
                p.title as problem_title,
                p.codeforces_url,
                p.solution_video_url,
                p.rating,
                s.id as sheet_id,
                s.name as sheet_name,
                s.contest_id,
                s.group_id,
                s.contest_url,
                l.slug as level_slug
            FROM curriculum_problems p
            JOIN curriculum_sheets s ON p.sheet_id = s.id
            JOIN curriculum_levels l ON s.level_id = l.id
            WHERE l.slug = $1 AND s.slug = $2 AND p.problem_letter = $3
        `, [levelSlug, sheetSlug, problemLetter]);

        if (result.rows.length === 0) {
            return NextResponse.json(
                { error: 'Problem not found' },
                { status: 404 }
            );
        }

        const data = result.rows[0];

        return NextResponse.json({
            success: true,
            problem: {
                id: data.problem_id,
                letter: data.problem_letter,
                number: data.problem_number,
                title: data.problem_title,
                codeforcesUrl: data.codeforces_url,
                solutionVideoUrl: data.solution_video_url,
                rating: data.rating,
                sheetId: data.sheet_id,
                contestId: data.contest_id,
                groupId: data.group_id,
                contestUrl: data.contest_url
            }
        });
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to fetch curriculum problem' },
            { status: 500 }
        );
    }
}
