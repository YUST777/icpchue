import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/db';
import { verifyAuth } from '@/lib/auth/auth';
import { ASSIGNMENTS, ASSIGNMENT_LEVEL, NEW_MEMBER_FROM } from '@/lib/assignments';

export const dynamic = 'force-dynamic';

/** GET /api/assignments: the assigned problems with this user's solved flag and due dates. */
export async function GET(req: NextRequest) {
    try {
        const user = await verifyAuth(req);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const [problems, account] = await Promise.all([
            query(
                `SELECT s.slug, UPPER(p.problem_letter) AS letter, p.title,
                        EXISTS (
                            SELECT 1 FROM user_progress up
                            WHERE up.user_id = $1 AND up.status = 'SOLVED'
                              AND up.problem_id = (s.contest_id::text || ':' || UPPER(p.problem_letter))
                        ) AS solved
                 FROM curriculum_sheets s
                 JOIN curriculum_levels l ON l.id = s.level_id
                 JOIN curriculum_problems p ON p.sheet_id = s.id
                 WHERE l.slug = $2 AND s.slug = ANY($3)
                 ORDER BY p.problem_number`,
                [user.id, ASSIGNMENT_LEVEL, ASSIGNMENTS.map((a) => a.sheet)]
            ),
            query('SELECT created_at FROM users WHERE id = $1', [user.id]),
        ]);

        const created = account.rows[0]?.created_at;
        const track = created && new Date(created) >= new Date(NEW_MEMBER_FROM) ? 'new' : 'old';

        const items = ASSIGNMENTS.flatMap((a) =>
            problems.rows
                .filter((r: { slug: string; letter: string }) => r.slug === a.sheet && a.letters.includes(r.letter))
                .map((r: { letter: string; title: string; solved: boolean }) => ({
                    sheet: a.sheet,
                    sheetLabel: a.label,
                    sheetName: a.name,
                    letter: r.letter,
                    title: r.title,
                    solved: r.solved,
                    due: a.due[track],
                    href: `/dashboard/sheets/${ASSIGNMENT_LEVEL}/${a.sheet}/${r.letter}`,
                }))
        );

        return NextResponse.json({ success: true, track, items });
    } catch {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
