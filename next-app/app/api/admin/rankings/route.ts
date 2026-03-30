import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth/auth';
import { query } from '@/lib/db/db';

export async function GET(req: NextRequest) {
    try {
        const admin = await verifyAdmin(req);
        if (!admin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const includeAll = searchParams.get('includeAll') === 'true';

        const whereClause = includeAll
            ? ''
            : `WHERE (u.is_shadow_banned = false OR u.is_shadow_banned IS NULL)
               AND (u.cheating_flags = 0 OR u.cheating_flags IS NULL)`;

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
            SELECT u.id, a.name, a.faculty, a.student_id, u.email, u.codeforces_handle,
                u.is_shadow_banned, u.cheating_flags,
                agg.solved::int, agg.total_seconds, COALESCE(sc.total_subs, 0) AS total_submissions
            FROM agg
            JOIN users u ON u.id = agg.user_id
            LEFT JOIN applications a ON a.id = u.application_id
            LEFT JOIN sub_counts sc ON sc.user_id = u.id
            ${whereClause}
            ORDER BY agg.solved DESC, agg.total_seconds ASC NULLS LAST
            LIMIT 200
        `);

        const rankings = result.rows.map((r: {
            id: number; name: string | null; faculty: string | null; student_id: string | null;
            email: string; solved: number; total_seconds: string; total_submissions: number;
            codeforces_handle: string | null; is_shadow_banned: boolean; cheating_flags: number;
        }, i: number) => ({
            rank: i + 1,
            userId: r.id,
            name: r.name || r.email?.split('@')[0] || 'Anonymous',
            faculty: r.faculty,
            studentId: r.student_id,
            codeforcesHandle: r.codeforces_handle,
            solved: r.solved,
            totalSeconds: parseInt(r.total_seconds) || 0,
            totalSubmissions: r.total_submissions ?? 0,
            isShadowBanned: r.is_shadow_banned || false,
            cheatingFlags: r.cheating_flags ?? 0
        }));

        return NextResponse.json({ success: true, rankings });
    } catch (error) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
