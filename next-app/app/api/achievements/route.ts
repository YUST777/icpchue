import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/db';
import { verifyAuth } from '@/lib/auth/auth';
import { getCachedData } from '@/lib/cache/cache';
import { checkProgressAchievements } from '@/lib/services/achievements';
import { UNCOUNTED_USER_IDS, SERIAL_CTE, factoryNumber } from '@/lib/achievements/factory';

export async function GET(req: NextRequest) {
    const authResult = await verifyAuth(req);
    if (!authResult) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Award newly earned progress badges, at most every 30 seconds per user.
        await getCachedData(`user:${authResult.id}:achievement-check`, 30, async () => ({
            granted: await checkProgressAchievements(authResult.id, authResult.role),
        }));

        const cacheKey = `user:${authResult.id}:achievements`;
        const data = await getCachedData(cacheKey, 300, async () => {
            const result = await query(
                `WITH ${SERIAL_CTE('$2')}
                 SELECT ua.id, ua.achievement_id, ua.earned_at, ua.seen, r.serial
                 FROM user_achievements ua LEFT JOIN ranked r ON r.id = ua.id
                 WHERE ua.user_id = $1 ORDER BY ua.seen ASC, ua.earned_at DESC`,
                [authResult.id, UNCOUNTED_USER_IDS]
            );
            return { achievements: result.rows.map((r: { id: number; serial: number | null }) => ({ ...r, serial: r.serial ?? undefined, factory: r.serial == null ? undefined : factoryNumber(r.id) })) };
        });

        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
