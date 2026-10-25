import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/db';
import { verifyAuth } from '@/lib/auth/auth';
import { getCachedData } from '@/lib/cache/cache';

/** How many members hold each badge, out of all members. Cached for 10 minutes. */
export async function GET(req: NextRequest) {
    const user = await verifyAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const data = await getCachedData('achievements:holder-stats:v1', 600, async () => {
            const [totalRes, countRes] = await Promise.all([
                query(`SELECT COUNT(*)::int AS n FROM users WHERE is_shadow_banned = FALSE OR is_shadow_banned IS NULL`),
                query(
                    `SELECT ua.achievement_id, COUNT(DISTINCT ua.user_id)::int AS n
                     FROM user_achievements ua
                     JOIN users u ON u.id = ua.user_id
                     WHERE u.is_shadow_banned = FALSE OR u.is_shadow_banned IS NULL
                     GROUP BY ua.achievement_id`
                ),
            ]);
            const counts: Record<string, number> = {};
            for (const row of countRes.rows) counts[row.achievement_id] = row.n;
            return { total: totalRes.rows[0]?.n ?? 0, counts };
        });
        return NextResponse.json(data, { headers: { 'Cache-Control': 'private, max-age=300, stale-while-revalidate=600' } });
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
