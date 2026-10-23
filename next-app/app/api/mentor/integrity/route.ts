import { NextRequest, NextResponse } from 'next/server';
import { verifyMentor } from '@/lib/auth/auth';
import { mentorVisibleUserIds } from '@/lib/auth/mentor-scope';
import { getIntegrityReport, type StudentRef } from '@/lib/integrity/report';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/mentor/integrity[?refresh=1]
 * Matching-code and pasted-code cases. A mentor sees only cases that involve
 * their own trainees; the other student in a match is anonymised for them.
 */
export async function GET(req: NextRequest) {
    try {
        const staff = await verifyMentor(req);
        if (!staff) return NextResponse.json({ error: 'Unauthorized: Mentor access required' }, { status: 403 });

        const refresh = new URL(req.url).searchParams.get('refresh') === '1';
        const report = await getIntegrityReport(refresh && (staff.role === 'owner' || staff.role === 'instructor'));
        const visible = await mentorVisibleUserIds(staff);
        if (!visible) return NextResponse.json(report, { headers: { 'Cache-Control': 'private, no-store' } });

        const mask = (s: StudentRef): StudentRef => visible.has(s.userId)
            ? s
            : { userId: s.userId, name: 'Another student', studentId: '', group: s.group };
        return NextResponse.json({
            ...report,
            pairs: report.pairs
                .filter((p) => visible.has(p.a.userId) || visible.has(p.b.userId))
                .map((p) => ({ ...p, a: mask(p.a), b: mask(p.b) })),
            rings: report.rings
                .filter((r) => r.members.some((m) => visible.has(m.userId)))
                .map((r) => ({ ...r, members: r.members.map(mask) })),
            behaviour: report.behaviour.filter((b) => visible.has(b.student.userId)),
            traps: report.traps
                .filter((t) => visible.has(t.codeOwner.userId) || visible.has(t.copiedBy.userId))
                .map((t) => ({ ...t, codeOwner: mask(t.codeOwner), copiedBy: mask(t.copiedBy) })),
            copyPaste: report.copyPaste.filter((c) => visible.has(c.student.userId)),
        }, { headers: { 'Cache-Control': 'private, no-store' } });
    } catch (error) {
        console.error('[Integrity] Failed:', error instanceof Error ? error.message : error);
        return NextResponse.json({ error: 'Could not build the integrity report.' }, { status: 500 });
    }
}
