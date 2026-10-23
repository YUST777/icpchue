import { NextRequest, NextResponse } from 'next/server';
import { verifyMentor } from '@/lib/auth/auth';
import { mentorVisibleUserIds } from '@/lib/auth/mentor-scope';
import { codeFor } from '@/lib/integrity/report';

export const dynamic = 'force-dynamic';

/** GET /api/mentor/integrity/code?a=&b=&contest=&p= — both students' code for one problem. */
export async function GET(req: NextRequest) {
    try {
        const staff = await verifyMentor(req);
        if (!staff) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        const url = new URL(req.url);
        const a = Number(url.searchParams.get('a'));
        const b = Number(url.searchParams.get('b'));
        const contest = String(url.searchParams.get('contest') || '');
        const p = String(url.searchParams.get('p') || '');
        if (!Number.isSafeInteger(a) || !Number.isSafeInteger(b) || !/^\d+$/.test(contest) || !/^[A-Za-z0-9]{1,4}$/.test(p)) {
            return NextResponse.json({ error: 'Bad request' }, { status: 400 });
        }
        // A mentor may compare only when one of the two is their own trainee.
        const visible = await mentorVisibleUserIds(staff);
        if (visible && !visible.has(a) && !visible.has(b)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        const codes = await codeFor([a, b], contest, p);
        return NextResponse.json({ a: codes[a] ?? null, b: codes[b] ?? null }, { headers: { 'Cache-Control': 'private, no-store' } });
    } catch (error) {
        console.error('[Integrity code] Failed:', error instanceof Error ? error.message : error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
