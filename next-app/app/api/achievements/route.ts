import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/db';
import { verifyAuth } from '@/lib/auth/auth';
import { getCachedData } from '@/lib/cache/cache';

export async function GET(req: NextRequest) {
    const authResult = await verifyAuth(req);
    if (!authResult) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const cacheKey = `user:${authResult.id}:achievements`;
        const data = await getCachedData(cacheKey, 300, async () => {
            const result = await query(
                `SELECT id, achievement_id, earned_at, seen FROM user_achievements WHERE user_id = $1 ORDER BY seen ASC, earned_at DESC`,
                [authResult.id]
            );
            return { achievements: result.rows };
        });

        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
