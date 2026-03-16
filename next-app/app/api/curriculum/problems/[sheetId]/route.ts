import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * GET /api/curriculum/problems/[sheetId]
 * Returns all problems for a given sheet with level and sheet metadata
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ sheetId: string }> }
) {
    try {
        const { sheetId } = await params;

        // Get sheet info with level info - Support both numeric ID and string slug
        const isNumeric = /^\d+$/.test(sheetId);
        const sheetResult = await query(`
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
                l.id as level_id,
                l.level_number,
                l.name as level_name,
                l.slug as level_slug
            FROM curriculum_sheets s
            JOIN curriculum_levels l ON s.level_id = l.id
            WHERE ${isNumeric ? 's.id = $1::bigint' : 's.slug = $1'}
        `, [sheetId]);

        if (sheetResult.rows.length === 0) {
            return NextResponse.json(
                { error: 'Sheet not found' },
                { status: 404 }
            );
        }

        const sheet = sheetResult.rows[0];

        // Get problems for this sheet
        const problemsResult = await query(`
            SELECT 
                id,
                problem_number,
                problem_letter,
                title,
                codeforces_url,
                rating
            FROM curriculum_problems
            WHERE sheet_id = $1
            ORDER BY problem_number ASC
        `, [sheet.id]);

        return NextResponse.json({
            success: true,
            level: {
                id: sheet.level_id,
                levelNumber: sheet.level_number,
                name: sheet.level_name,
                slug: sheet.level_slug
            },
            sheet: {
                id: sheet.id,
                letter: sheet.sheet_letter,
                number: sheet.sheet_number,
                name: sheet.name,
                slug: sheet.slug,
                description: sheet.description,
                contestId: sheet.contest_id,
                contestUrl: sheet.contest_url,
                totalProblems: sheet.total_problems
            },
            problems: problemsResult.rows.map(problem => ({
                id: problem.id,
                number: problem.problem_number,
                letter: problem.problem_letter,
                title: problem.title,
                codeforcesUrl: problem.codeforces_url,
                rating: problem.rating
            }))
        }, {
            headers: {
                'Cache-Control': 'public, max-age=300, stale-while-revalidate=600'
            }
        });
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to fetch curriculum problems' },
            { status: 500 }
        );
    }
}
