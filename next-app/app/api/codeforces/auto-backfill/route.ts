import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/auth';
import { query } from '@/lib/db/db';
import { invalidateCache } from '@/lib/cache/cache';
import { rateLimit } from '@/lib/cache/rate-limit';
import {
    applyBackfillBatches,
    loadCurriculumIndex,
    type BackfillBatch,
    normalizeVerdict,
} from '@/lib/services/codeforces-backfill';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const API_TIMEOUT_MS = 15_000;

interface CFSubmission {
    id: number;
    contestId?: number;
    creationTimeSeconds?: number;
    verdict?: string;
    timeConsumedMillis?: number;
    memoryConsumedBytes?: number;
    programmingLanguage?: string;
    problem?: { index?: string };
}

/**
 * Import public Codeforces history. This route intentionally does not claim
 * group contests: user.status cannot see private/group submissions. The
 * browser extension's batch endpoint remains the source for those rows.
 */
export async function POST(req: NextRequest) {
    try {
        const user = await verifyAuth(req);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const rl = await rateLimit(`auto-backfill:${user.id}`, 2, 300);
        if (!rl.success) {
            // Public sync may already have completed in another tab. Keep the
            // browser-side group sync eligible rather than hiding it behind a
            // false "failure" response.
            return NextResponse.json({ success: true, skipped: true, reason: 'rate_limited', groupContestsRequireExtension: true });
        }

        // Atomically acquire a short lease. Multiple tabs/requests therefore
        // collapse to one Codeforces fetch instead of dog-piling the API.
        const claim = await query(`
            UPDATE users
            SET auto_backfill_lease_until = NOW() + INTERVAL '2 minutes'
            WHERE id = $1
              AND (auto_backfill_lease_until IS NULL OR auto_backfill_lease_until < NOW())
              AND (last_auto_backfill IS NULL OR last_auto_backfill < NOW() - INTERVAL '6 hours')
            RETURNING codeforces_handle
        `, [user.id]);

        if (claim.rows.length === 0) {
            return NextResponse.json({ success: true, skipped: true, reason: 'cooldown_or_in_progress', groupContestsRequireExtension: true });
        }

        const handle = String(claim.rows[0]?.codeforces_handle || '').trim();
        if (!handle) {
            await query('UPDATE users SET auto_backfill_lease_until = NULL WHERE id = $1', [user.id]);
            return NextResponse.json({ skipped: true, reason: 'no_codeforces_handle' });
        }

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
            let cfRes: Response;
            try {
                cfRes = await fetch(
                    `https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle)}&from=1&count=10000`,
                    {
                        signal: controller.signal,
                        headers: {
                            'User-Agent': 'ICPCHUE/1.0 (Codeforces history sync)',
                            Accept: 'application/json',
                        },
                    }
                );
            } finally {
                clearTimeout(timeout);
            }

            if (!cfRes.ok) throw new Error(`Codeforces API HTTP ${cfRes.status}`);
            const data = await cfRes.json();
            if (data?.status !== 'OK' || !Array.isArray(data.result)) {
                throw new Error(data?.comment || 'Codeforces API returned an invalid response');
            }

            const publicByContest = new Map<string, CFSubmission[]>();
            for (const submission of data.result as CFSubmission[]) {
                const contestId = String(submission.contestId || '').trim();
                const problemIndex = String(submission.problem?.index || '').trim();
                if (!contestId || !problemIndex || !submission.id) continue;
                const rows = publicByContest.get(contestId) || [];
                rows.push(submission);
                publicByContest.set(contestId, rows);
            }

            const batches: BackfillBatch[] = Array.from(publicByContest, ([contestId, rows]) => ({
                contestId,
                urlType: 'contest',
                groupId: null,
                allowGroup: false,
                submissions: rows.map(row => ({
                    id: row.id,
                    problemIndex: row.problem?.index,
                    verdict: normalizeVerdict(row.verdict),
                    timeConsumedMillis: row.timeConsumedMillis,
                    memoryConsumedBytes: row.memoryConsumedBytes,
                    language: row.programmingLanguage,
                    creationTimeSeconds: row.creationTimeSeconds,
                })),
            }));

            const index = await loadCurriculumIndex();
            const result = await applyBackfillBatches(user.id, handle, batches, index);

            // A successful response (including zero matches) is a completed
            // public sync. Group history is reported separately and is never
            // silently treated as synchronized.
            await query(`
                UPDATE users
                SET last_auto_backfill = NOW(), auto_backfill_lease_until = NULL
                WHERE id = $1
            `, [user.id]);

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

            return NextResponse.json({
                success: true,
                source: 'codeforces-api',
                totalCFSubmissions: data.result.length,
                publicContests: batches.length,
                ...result,
                groupContestsRequireExtension: index.groupTargets.size > 0,
            });
        } catch (error) {
            await query('UPDATE users SET auto_backfill_lease_until = NULL WHERE id = $1', [user.id]);
            console.error('[AutoBackfill] public sync failed:', error);
            return NextResponse.json({ error: 'Codeforces is temporarily unavailable', retryable: true }, { status: 502 });
        }
    } catch (err) {
        console.error('[AutoBackfill] error:', err);
        return NextResponse.json({ error: 'Auto-backfill failed' }, { status: 500 });
    }
}
