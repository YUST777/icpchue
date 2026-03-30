import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/auth';
import { getUserStreak } from '@/lib/services/streaks';
import { getCache, setCache } from '@/lib/cache/cache';
import { rateLimit } from '@/lib/cache/rate-limit';

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

        // Rate limit: 10 per 60s per user
        const ratelimit = await rateLimit(`streak_view:${user.id}`, 10, 60);
        if (!ratelimit.success) {
            return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
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
