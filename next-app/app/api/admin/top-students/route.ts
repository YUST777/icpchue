import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth/auth';
import { query } from '@/lib/db/db';

export async function GET(req: NextRequest) {
    try {
        const admin = await verifyAdmin(req);
        if (!admin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const result = await query(`
            SELECT u.id, a.name, a.faculty, a.student_id, u.email,
                uss.distinct_solved AS solved, 0::bigint AS total_seconds,
                COALESCE(uss.total_submissions, 0) AS total_submissions,
                u.codeforces_handle
            FROM user_solve_stats uss
            JOIN users u ON u.id = uss.user_id
            LEFT JOIN applications a ON a.id = u.application_id
            WHERE (u.is_shadow_banned = false OR u.is_shadow_banned IS NULL)
              AND (u.cheating_flags = 0 OR u.cheating_flags IS NULL)
            ORDER BY uss.distinct_solved DESC, uss.total_submissions ASC NULLS LAST
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
