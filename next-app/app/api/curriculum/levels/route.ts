import { NextResponse } from 'next/server';
import { query } from '@/lib/db/db';

/**
 * GET /api/curriculum/levels
 * Returns all curriculum levels ordered by level_number
 */
export async function GET() {
    try {
        const result = await query(`
            SELECT 
                id,
                level_number,
                name,
                slug,
                description,
                duration_weeks,
                total_problems,
                created_at
            FROM curriculum_levels
            ORDER BY level_number ASC
        `);

        return NextResponse.json({
            success: true,
            levels: result.rows
        }, {
            headers: {
                'Cache-Control': 'public, max-age=300, stale-while-revalidate=600'
            }
        });
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to fetch curriculum levels' },
            { status: 500 }
        );
    }
}
