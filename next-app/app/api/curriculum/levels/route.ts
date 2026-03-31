import { NextResponse } from 'next/server';
import { query } from '@/lib/db/db';
import { getCachedData } from '@/lib/cache/cache';

/**
 * GET /api/curriculum/levels
 * Returns all curriculum levels ordered by level_number
 * Cached for 1 hour — curriculum rarely changes
 */
export async function GET() {
    try {
        const levels = await getCachedData('curriculum:levels', 3600, async () => {
            const result = await query(`
                SELECT 
                    id, level_number, name, slug, description,
                    duration_weeks, total_problems, created_at
                FROM curriculum_levels
                ORDER BY level_number ASC
            `);
            return result.rows;
        });

        return NextResponse.json({
            success: true,
            levels
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
