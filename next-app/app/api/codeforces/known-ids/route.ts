import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/auth';
import { query } from '@/lib/db/db';
import { rateLimit } from '@/lib/cache/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * POST /api/codeforces/known-ids  { ids: number[] }
 * Which of these Codeforces submission ids are already saved for this user.
 * Lets the quick sync decide whether a contest needs a deeper history read.
 */
export async function POST(req: NextRequest) {
    try {
        const user = await verifyAuth(req);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const rl = await rateLimit(`cf-known-ids:${user.id}`, 20, 60);
        if (!rl.success) return NextResponse.json({ error: 'Too many requests. Please wait.' }, { status: 429 });

        const body = await req.json().catch(() => ({}));
        const ids = Array.isArray(body?.ids)
            ? body.ids.map(Number).filter((n: number) => Number.isSafeInteger(n) && n > 0).slice(0, 2000)
            : [];
        if (ids.length === 0) return NextResponse.json({ known: [] });

        const result = await query(
            'SELECT cf_submission_id FROM submissions WHERE user_id = $1 AND cf_submission_id = ANY($2::bigint[])',
            [user.id, ids]
        );
        return NextResponse.json({ known: result.rows.map((r: { cf_submission_id: string }) => Number(r.cf_submission_id)) });
    } catch (error) {
        console.error('[known-ids] Failed:', error instanceof Error ? error.message : error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
