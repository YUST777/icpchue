import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { getCachedData } from '@/lib/cache';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const user = await verifyAuth(req);
        if (!user) {
            return NextResponse.json({ success: true, progress: {} });
        }

        const cacheKey = `user:${user.id}:curriculum_progress`;
        const progress = await getCachedData(cacheKey, 300, async () => {
            const statsResult = await query(`
                SELECT 
                    l.slug as level_slug,
                    COUNT(DISTINCT p.id) as total_problems,
                    COUNT(DISTINCT CASE WHEN up.status = 'SOLVED' THEN p.id END) as solved_count
                FROM curriculum_levels l
                JOIN curriculum_sheets s ON s.level_id = l.id
                JOIN curriculum_problems p ON p.sheet_id = s.id
                LEFT JOIN user_progress up ON 
                    up.user_id = $1 AND 
                    up.problem_id = (s.contest_id::text || ':' || UPPER(p.problem_letter))
                GROUP BY l.id, l.slug
            `, [user.id]);

            const progressMap: Record<string, { solved: number; total: number }> = {};
            statsResult.rows.forEach((row: any) => {
                progressMap[row.level_slug] = {
                    solved: parseInt(row.solved_count) || 0,
                    total: parseInt(row.total_problems) || 0
                };
            });
            return progressMap;
        });

        return NextResponse.json({ success: true, progress });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
