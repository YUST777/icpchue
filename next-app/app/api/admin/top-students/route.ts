import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
    try {
        const admin = await verifyAdmin(req);
        if (!admin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const result = await query(`
            WITH solves AS (
                SELECT user_id, COALESCE(CAST(sheet_id AS TEXT), CAST(contest_id AS TEXT)) || '-' || problem_index AS pk, NULL::int AS time_to_solve_seconds
                FROM cf_submissions WHERE verdict = 'Accepted'
            ),
            agg AS (
                SELECT user_id, COUNT(DISTINCT pk) AS solved, COALESCE(SUM(time_to_solve_seconds), 0)::bigint AS total_seconds
                FROM solves
                GROUP BY user_id
            ),
            sub_counts AS (
                SELECT user_id, COUNT(*)::int AS total_subs
                FROM cf_submissions
                GROUP BY user_id
            )
            SELECT u.id, a.name, a.faculty, a.student_id, u.email, agg.solved::int, agg.total_seconds, COALESCE(sc.total_subs, 0) AS total_submissions,
                u.codeforces_handle
            FROM agg
            JOIN users u ON u.id = agg.user_id
            LEFT JOIN applications a ON a.id = u.application_id
            LEFT JOIN sub_counts sc ON sc.user_id = u.id
            WHERE (u.is_shadow_banned = false OR u.is_shadow_banned IS NULL)
              AND (u.cheating_flags = 0 OR u.cheating_flags IS NULL)
            ORDER BY agg.solved DESC, agg.total_seconds DESC NULLS LAST
            LIMIT 100
        `);

        const students = result.rows.map((r: {
            id: number; name: string | null; faculty: string | null; student_id: string | null;
            email: string; solved: number; total_seconds: string; total_submissions: number;
            codeforces_handle: string | null;
        }, i: number) => ({
            rank: i + 1,
            userId: r.id,
            name: r.name || r.email?.split('@')[0] || 'Anonymous',
            faculty: r.faculty,
            studentId: r.student_id,
            codeforcesHandle: r.codeforces_handle,
            solved: r.solved,
            totalSeconds: parseInt(r.total_seconds) || 0,
            totalSubmissions: r.total_submissions ?? 0
        }));

        return NextResponse.json({ success: true, students });
    } catch (error) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
