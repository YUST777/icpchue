import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/auth';
import { query } from '@/lib/db/db';
import { rateLimit } from '@/lib/cache/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * POST /api/codeforces/missing-sources  { limit?: number, skip?: number[] }
 * This user's synced Codeforces submissions that still have no source code,
 * accepted ones first, newest first. The browser extension then reads each
 * one's code and saves it through PATCH /api/submissions/cf/[id].
 */
export async function POST(req: NextRequest) {
    try {
        const user = await verifyAuth(req);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const rl = await rateLimit(`cf-missing-sources:${user.id}`, 10, 60);
        if (!rl.success) return NextResponse.json({ error: 'Too many requests. Please wait.' }, { status: 429 });

        const body = await req.json().catch(() => ({}));
        const limit = Math.min(25, Math.max(1, Number(body?.limit) || 10));
        const skip = Array.isArray(body?.skip)
            ? body.skip.map(Number).filter((n: number) => Number.isSafeInteger(n) && n > 0).slice(0, 1000)
            : [];

        const result = await query(
            `SELECT id, cf_submission_id, contest_id, url_type, group_id
               FROM submissions
              WHERE user_id = $1
                AND source = 'codeforces'
                AND cf_submission_id IS NOT NULL
                AND source_code IS NULL
                AND contest_id ~ '^[0-9]+$'
                AND (url_type IN ('contest', 'gym') OR (url_type = 'group' AND group_id IS NOT NULL))
                AND NOT (cf_submission_id = ANY($2::bigint[]))
              ORDER BY (verdict IN ('Accepted', 'OK')) DESC, cf_submission_id DESC
              LIMIT $3`,
            [user.id, skip, limit]
        );
        return NextResponse.json({
            submissions: result.rows.map((r: { id: string; cf_submission_id: string; contest_id: string; url_type: string; group_id: string | null }) => ({
                id: Number(r.id),
                cfSubmissionId: Number(r.cf_submission_id),
                contestId: r.contest_id,
                urlType: r.url_type,
                groupId: r.group_id,
            })),
        });
    } catch (error) {
        console.error('[missing-sources] Failed:', error instanceof Error ? error.message : error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
