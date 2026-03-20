import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getUserStreak } from '@/lib/streaks';
import { getCache, setCache } from '@/lib/cache';

/**
 * GET /api/user/streak
 * Returns current streak for the authenticated user.
 */
export async function GET(req: NextRequest) {
    try {
        const user = await verifyAuth(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const cacheKey = `user:${user.id}:streak`;
        const cached = await getCache(cacheKey);
        if (cached) return NextResponse.json(cached);

        const streakData = await getUserStreak(user.id);
        
        await setCache(cacheKey, streakData, 3600); // 1 hour cache

        return NextResponse.json(streakData);

    } catch (error: any) {
        console.error('[API Streak] Error:', error.message);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
