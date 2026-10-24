import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/db';
import { verifyAuth } from '@/lib/auth/auth';
import { scrapeCodeforces } from '@/lib/services/codeforces';
import { invalidateCache } from '@/lib/cache/cache';
import { rateLimit } from '@/lib/cache/rate-limit';

export async function POST(req: NextRequest) {
    try {
        const authUser = await verifyAuth(req);
        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized: Please log in to sync your Codeforces handle' }, { status: 401 });
        }

        const userId = authUser.id;
        const rl = await rateLimit(`sync-cf-handle:${userId}`, 15, 60);
        if (!rl.success) {
            return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
        }

        const body = await req.json().catch(() => ({}));
        const rawHandle = String(body.handle || '').trim();

        if (!rawHandle || !/^[A-Za-z0-9_.-]{1,24}$/.test(rawHandle)) {
            return NextResponse.json({ error: 'Invalid Codeforces handle format' }, { status: 400 });
        }

        // Check if another account already has this handle
        const conflict = await query(
            'SELECT id FROM users WHERE LOWER(codeforces_handle) = LOWER($1) AND id <> $2 LIMIT 1',
            [rawHandle, userId]
        );
        if (conflict.rows.length > 0) {
            return NextResponse.json({
                error: `Codeforces handle "${rawHandle}" is already linked to another account`,
                code: 'HANDLE_TAKEN'
            }, { status: 409 });
        }

        // Get current user data
        const userRes = await query(
            'SELECT codeforces_handle, codeforces_data, application_id FROM users WHERE id = $1',
            [userId]
        );
        if (userRes.rows.length === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const currentHandle = userRes.rows[0].codeforces_handle;
        const currentData = userRes.rows[0].codeforces_data;
        const isSameHandle = currentHandle && currentHandle.toLowerCase() === rawHandle.toLowerCase();

        // Check if CF data needs refresh (if not present or > 2 hours old)
        let cfData = currentData;
        const lastUpdated = cfData?.lastUpdated ? new Date(cfData.lastUpdated).getTime() : 0;
        const needsScrape = !isSameHandle || !cfData || (Date.now() - lastUpdated > 2 * 60 * 60 * 1000);

        if (needsScrape) {
            try {
                const freshData = await scrapeCodeforces(rawHandle);
                if (freshData) {
                    cfData = freshData;
                }
            } catch (err) {
                console.warn('[SyncHandle] Failed to scrape CF data:', err);
            }
        }

        // Update users table
        await query(
            `UPDATE users
             SET codeforces_handle = $1,
                 codeforces_data = COALESCE($2::jsonb, codeforces_data),
                 show_on_cf_leaderboard = TRUE,
                 show_public_profile = TRUE,
                 updated_at = NOW()
             WHERE id = $3`,
            [rawHandle, cfData ? JSON.stringify(cfData) : null, userId]
        );

        // Update applications table if linked
        const appId = userRes.rows[0].application_id;
        if (appId) {
            await query(
                `UPDATE applications
                 SET codeforces_profile = $1,
                     codeforces_data = COALESCE($2::jsonb, codeforces_data)
                 WHERE id = $3`,
                [rawHandle, cfData ? JSON.stringify(cfData) : null, appId]
            );
        }

        // Invalidate caches
        await Promise.all([
            invalidateCache(`user:${userId}:profile`),
            invalidateCache('leaderboard:codeforces:v2')
        ]);

        return NextResponse.json({
            success: true,
            handle: rawHandle,
            rating: cfData?.rating || 0,
            rank: cfData?.rank || 'unrated',
            maxRating: cfData?.maxRating || 0,
            synced: true
        });

    } catch (error: any) {
        console.error('[SyncHandle Route Error]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
