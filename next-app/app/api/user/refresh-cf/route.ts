import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/db';
import { verifyAuth } from '@/lib/auth/auth';
import { scrapeCodeforces, extractUsername } from '@/lib/services/codeforces';

// Add type definition for global
declare global {
    var cfRefreshRateLimits: Map<string, number> | undefined;
}

export async function POST(request: NextRequest) {
    try {
        const authUser = await verifyAuth(request);
        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = authUser.id;

        // Rate Limiting (In-Memory) - Strictly limit scraping to avoid IP Ban
        const RATE_LIMIT_DURATION = 60 * 1000; // 60 seconds
        const lastRefreshTime = global.cfRefreshRateLimits?.get(String(userId)) || 0;
        const now = Date.now();

        if (now - lastRefreshTime < RATE_LIMIT_DURATION) {
            const waitSeconds = Math.ceil((RATE_LIMIT_DURATION - (now - lastRefreshTime)) / 1000);
            return NextResponse.json(
                { error: `Please wait ${waitSeconds}s before refreshing again` },
                { status: 429 }
            );
        }

        // Initialize global map if needed
        if (!global.cfRefreshRateLimits) {
            global.cfRefreshRateLimits = new Map();
        }
        global.cfRefreshRateLimits.set(String(userId), now);

        // Get user's codeforces_handle from users table
        const userResult = await query('SELECT codeforces_handle FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const cfHandle = userResult.rows[0].codeforces_handle;
        if (!cfHandle) {
            return NextResponse.json({ error: 'No Codeforces profile linked' }, { status: 400 });
        }

        // The handle is stored in plaintext in users table
        const username = extractUsername(cfHandle, 'codeforces');

        if (!username) {
            return NextResponse.json({ error: 'Invalid Codeforces handle' }, { status: 400 });
        }

        const codeforcesData = await scrapeCodeforces(username);

        if (codeforcesData) {
            // Store codeforces_data in users table (not applications)
            await query(
                'UPDATE users SET codeforces_data = $1 WHERE id = $2',
                [JSON.stringify(codeforcesData), userId]
            );

            // Check for achievements
            if (codeforcesData.rating && parseInt(String(codeforcesData.rating)) >= 500) {
                try {
                    const { grantAchievement, ACHIEVEMENTS, syncRank1Achievement } = await import('@/lib/services/achievements');
                    await grantAchievement(userId, ACHIEVEMENTS.RANK_500);
                    await syncRank1Achievement('refresh');
                } catch {
                }
            }

            // Invalidate caches
            const { invalidateCache } = await import('@/lib/cache/cache');
            await invalidateCache(`user:${userId}:profile`);
            await invalidateCache('leaderboard:codeforces');

            return NextResponse.json({ success: true, data: codeforcesData });
        } else {
            return NextResponse.json({ error: 'Failed to scrape Codeforces data' }, { status: 500 });
        }

    } catch (error) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

