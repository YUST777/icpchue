import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/auth';
import { query } from '@/lib/db/db';
import { invalidateCache } from '@/lib/cache/cache';
import { rateLimit } from '@/lib/cache/rate-limit';
import { decrypt } from '@/lib/security/encryption';

export const dynamic = 'force-dynamic';

/**
 * POST /api/codeforces/backfill
 *
 * Bulk-marks problems SOLVED from Accepted submissions the user already made on
 * Codeforces. Called (per sheet) by the Settings "backfill" button after the
 * extension reads the user's submissions from their own browser/IP.
 *
 * Body:
 *   {
 *     sheetId: string,
 *     contestId: string,
 *     urlType?: 'contest'|'group'|'gym',
 *     groupId?: string|null,
 *     cfHandle: string,                // resolved by the extension's CF session
 *     accepted: [{ problemIndex, id, timeConsumedMillis?, memoryConsumedBytes?, language? }]
 *   }
 *
 * Security:
 *   - auth-gated + rate-limited.
 *   - cfHandle must match the user's linked codeforces_handle (if set).
 *   - only problem indices that actually belong to this sheet are accepted, so a
 *     spoofed payload can't mark arbitrary problems.
 */
export async function POST(req: NextRequest) {
    try {
        const user = await verifyAuth(req);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Generous but bounded: a full backfill posts once per sheet.
        const rl = await rateLimit(`cf-backfill:${user.id}`, 60, 60);
        if (!rl.success) {
            return NextResponse.json({ error: 'Too many requests. Please wait.' }, { status: 429 });
        }

        const body = await req.json();
        const { sheetId, contestId, urlType, groupId, cfHandle } = body;
        const accepted: Array<{
            problemIndex: string;
            id: number | string;
            timeConsumedMillis?: number;
            memoryConsumedBytes?: number;
            language?: string;
        }> = Array.isArray(body.accepted) ? body.accepted : [];

        if (!contestId) {
            return NextResponse.json({ error: 'Missing contestId' }, { status: 400 });
        }
        if (accepted.length === 0) {
            return NextResponse.json({ success: true, solved: 0, skipped: 0, message: 'Nothing to backfill' });
        }

        // ── Handle ownership check ──
        const userResult = await query(
            'SELECT codeforces_handle, email FROM users WHERE id = $1',
            [user.id]
        );
        const userHandle: string | null = userResult.rows[0]?.codeforces_handle || null;
        const userEmail: string | null = userResult.rows[0]?.email || null;

        let finalHandle = (cfHandle || '').trim();
        if (!finalHandle) {
            finalHandle = userHandle || (userEmail ? (decrypt(userEmail) || userEmail).split('@')[0] : 'unknown');
        }
        if (userHandle && finalHandle && finalHandle.toLowerCase() !== userHandle.toLowerCase()) {
            return NextResponse.json({ error: 'CF handle mismatch' }, { status: 403 });
        }

        // ── Restrict to problems that really belong to this sheet/contest ──
        // This prevents a spoofed payload from marking problems outside the sheet.
        const validRows = await query(
            `SELECT p.problem_letter
             FROM curriculum_problems p
             JOIN curriculum_sheets s ON p.sheet_id = s.id
             WHERE s.contest_id = $1`,
            [String(contestId)]
        );
        const validIndices = new Set(
            validRows.rows.map((r: any) => String(r.problem_letter).toUpperCase())
        );

        // De-dupe + filter the incoming ACs to valid, in-sheet problems.
        const seen = new Set<string>();
        const toApply = accepted.filter(a => {
            const idx = String(a.problemIndex || '').toUpperCase();
            const sid = parseInt(String(a.id), 10);
            if (!idx || !Number.isFinite(sid) || sid <= 0) return false;
            if (!validIndices.has(idx)) return false;
            if (seen.has(idx)) return false;
            seen.add(idx);
            return true;
        });

        if (toApply.length === 0) {
            return NextResponse.json({ success: true, solved: 0, skipped: accepted.length, message: 'No matching in-sheet ACs' });
        }

        let newlySolved = 0;

        for (const a of toApply) {
            const idx = String(a.problemIndex).toUpperCase();
            const cfSubmissionId = parseInt(String(a.id), 10);
            const timeMs = Number(a.timeConsumedMillis) || 0;
            const memoryKb = Math.round((Number(a.memoryConsumedBytes) || 0) / 1024);
            const trackingProblemId = `${contestId}:${idx}`;

            // 1. Upsert into the unified submissions table (trigger updates stats).
            await query(
                `INSERT INTO submissions (
                    user_id, source, cf_submission_id, contest_id, problem_index, sheet_id,
                    verdict, time_ms, memory_kb, language, cf_handle, url_type, group_id
                ) VALUES ($1, 'codeforces', $2, $3, $4, $5, 'Accepted', $6, $7, $8, $9, $10, $11)
                ON CONFLICT (cf_submission_id) DO UPDATE SET
                    verdict = 'Accepted',
                    time_ms = EXCLUDED.time_ms,
                    memory_kb = EXCLUDED.memory_kb`,
                [
                    user.id,
                    cfSubmissionId,
                    String(contestId),
                    idx,
                    sheetId || null,
                    timeMs,
                    memoryKb,
                    a.language || 'C++',
                    finalHandle || null,
                    urlType || 'contest',
                    groupId || null,
                ]
            );

            // 2. Upsert user_progress; count rows that transition to SOLVED.
            const progressRes = await query(
                `INSERT INTO user_progress (user_id, problem_id, sheet_id, status, submission_id, solved_at)
                 VALUES ($1, $2, $3, 'SOLVED', $4, now())
                 ON CONFLICT (user_id, problem_id) DO UPDATE SET
                    status = 'SOLVED',
                    submission_id = CASE WHEN user_progress.status = 'SOLVED' THEN user_progress.submission_id ELSE EXCLUDED.submission_id END,
                    solved_at = CASE WHEN user_progress.status = 'SOLVED' THEN user_progress.solved_at ELSE EXCLUDED.solved_at END
                 WHERE user_progress.status IS DISTINCT FROM 'SOLVED'
                 RETURNING (xmax = 0) AS inserted`,
                [user.id, trackingProblemId, sheetId || null, cfSubmissionId]
            );
            // A returned row means it was inserted or transitioned to SOLVED.
            if (progressRes.rows.length > 0) {
                newlySolved++;
            }
        }

        // Persist the handle if the user hadn't linked one yet.
        if (!userHandle && finalHandle && finalHandle !== 'unknown') {
            await query('UPDATE users SET codeforces_handle = $1 WHERE id = $2', [finalHandle, user.id]);
        }

        // Invalidate caches once for the whole sheet (cheaper than per-problem).
        if (newlySolved > 0) {
            const { updateStreakOnSolve } = await import('@/lib/services/streaks');
            await Promise.all([
                updateStreakOnSolve(user.id),
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
            solved: newlySolved,
            applied: toApply.length,
            skipped: accepted.length - toApply.length,
        });
    } catch (err: any) {
        console.error('[Backfill] error:', err);
        return NextResponse.json({ error: 'Backfill failed' }, { status: 500 });
    }
}
