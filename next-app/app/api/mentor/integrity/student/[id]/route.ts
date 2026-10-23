import { NextRequest, NextResponse } from 'next/server';
import { verifyMentor } from '@/lib/auth/auth';
import { mentorVisibleUserIds } from '@/lib/auth/mentor-scope';
import { studentIntegrity } from '@/lib/integrity/report';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** GET /api/mentor/integrity/student/[id] — code matches and pasted code for one trainee (users.id). */
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const staff = await verifyMentor(req);
        if (!staff) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        const userId = Number((await context.params).id);
        if (!Number.isSafeInteger(userId) || userId <= 0) return NextResponse.json({ error: 'Bad request' }, { status: 400 });

        const visible = await mentorVisibleUserIds(staff);
        if (visible && !visible.has(userId)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        const result = await studentIntegrity(userId);
        if (visible) {
            // Other groups' students stay anonymous to a mentor.
            result.matches = result.matches.map((m) => visible.has(m.other.userId)
                ? m
                : { ...m, other: { userId: m.other.userId, name: 'Another student', studentId: '', group: m.other.group } });
        }
        return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
    } catch (error) {
        console.error('[Integrity student] Failed:', error instanceof Error ? error.message : error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
