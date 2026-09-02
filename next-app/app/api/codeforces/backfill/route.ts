import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/auth';
import { query } from '@/lib/db/db';
import { invalidateCache } from '@/lib/cache/cache';
import { rateLimit } from '@/lib/cache/rate-limit';
import {
    applyBackfillBatches,
    loadCurriculumIndex,
    type BackfillBatch,
} from '@/lib/services/codeforces-backfill';

export const dynamic = 'force-dynamic';

/**
 * POST /api/codeforces/backfill
 *
 * Imports one or more contest histories returned by the browser extension.
 * Group contests must be read in the browser because Codeforces does not
 * expose them through user.status. The endpoint is deliberately batch based:
 * the extension can scan contests in parallel and perform one database
 * transaction instead of 500 individual INSERT requests.
 */
export async function POST(req: NextRequest) {
    try {
        const user = await verifyAuth(req);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const rl = await rateLimit(`cf-backfill:${user.id}`, 6, 60);
        if (!rl.success) return NextResponse.json({ error: 'Too many requests. Please wait.' }, { status: 429 });

        const body = await req.json();
        const requestedBatches = Array.isArray(body?.batches)
            ? body.batches
            : [{
                sheetId: body?.sheetId,
                contestId: body?.contestId,
                urlType: body?.urlType,
                groupId: body?.groupId,
                accepted: body?.accepted,
                submissions: body?.submissions,
            }];

        if (requestedBatches.length === 0 || requestedBatches.length > 100) {
            return NextResponse.json({ error: 'Invalid batch count' }, { status: 400 });
        }
        const payloadRows = requestedBatches.reduce((total: number, batch: any) =>
            total + (Array.isArray(batch?.submissions) ? batch.submissions.length : 0) +
            (Array.isArray(batch?.accepted) ? batch.accepted.length : 0), 0);
        if (payloadRows > 25_000) {
            return NextResponse.json({ error: 'Backfill payload is too large' }, { status: 413 });
        }

        const userResult = await query(
            'SELECT codeforces_handle FROM users WHERE id = $1',
            [user.id]
        );
        const userHandle: string | null = userResult.rows[0]?.codeforces_handle || null;

        const submittedHandle = String(body?.cfHandle || '').trim();
        const finalHandle = submittedHandle || userHandle;

        if (userHandle && submittedHandle && submittedHandle.toLowerCase() !== userHandle.toLowerCase()) {
            return NextResponse.json({ error: 'CF handle mismatch' }, { status: 403 });
        }
        if (!finalHandle) {
            return NextResponse.json({ error: 'Codeforces handle is required' }, { status: 400 });
        }

        const batches: BackfillBatch[] = requestedBatches.map((batch: any) => ({
            sheetId: batch?.sheetId == null ? null : String(batch.sheetId),
            contestId: batch?.contestId,
            urlType: batch?.urlType,
            groupId: batch?.groupId == null ? null : String(batch.groupId),
            accepted: Array.isArray(batch?.accepted) ? batch.accepted : [],
            submissions: Array.isArray(batch?.submissions) ? batch.submissions : [],
            // This endpoint receives data read from the user's authenticated
            // browser, so group contests are explicitly allowed.
            allowGroup: true,
        }));

        const index = await loadCurriculumIndex();
        const result = await applyBackfillBatches(user.id, finalHandle || null, batches, index);

        if (!userHandle && finalHandle && finalHandle !== 'unknown') {
            await query('UPDATE users SET codeforces_handle = $1 WHERE id = $2', [finalHandle, user.id]);
        }

        if (result.newlySolved > 0) {
            await Promise.all([
                invalidateCache(`user:${user.id}:dashboard_stats`),
                invalidateCache(`user:${user.id}:roadmap`),
                invalidateCache(`user:${user.id}:streak`),
                invalidateCache(`user:${user.id}:achievements`),
                invalidateCache(`user:${user.id}:curriculum_progress`),
                invalidateCache('leaderboard:sheets:public'),
            ]);
        }

        return NextResponse.json({ success: true, ...result });
    } catch (err) {
        console.error('[Backfill] error:', err);
        return NextResponse.json({ error: 'Backfill failed' }, { status: 500 });
    }
}
