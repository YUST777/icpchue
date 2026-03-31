import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth/auth';
import { query } from '@/lib/db/db';
import { decrypt } from '@/lib/security/encryption';

export async function GET(req: NextRequest) {
    try {
        const admin = await verifyAdmin(req);
        if (!admin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
        const offset = (page - 1) * limit;

        const result = await query(`
            WITH solved_counts AS (
                SELECT user_id, COUNT(DISTINCT problem_key) AS solved
                FROM (
                    SELECT user_id, COALESCE(sheet_id, contest_id::text) || '-' || problem_index AS problem_key
                    FROM cf_submissions WHERE verdict = 'Accepted'
                ) AS all_solves
                GROUP BY user_id
            ),
            sub_counts AS (
                SELECT user_id, COUNT(*)::int AS total_subs
                FROM cf_submissions
                GROUP BY user_id
            )
            SELECT u.id, u.email, u.role, u.is_shadow_banned, u.cheating_flags,
                u.created_at, u.last_login_at, u.codeforces_handle,
                a.name, a.student_id, a.faculty,
                COALESCE(sc.solved, 0)::int AS solved_count,
                COALESCE(sc2.total_subs, 0)::int AS total_submissions
            FROM users u
            LEFT JOIN applications a ON a.id = u.application_id
            LEFT JOIN solved_counts sc ON sc.user_id = u.id
            LEFT JOIN sub_counts sc2 ON sc2.user_id = u.id
            ORDER BY u.created_at DESC
            LIMIT $1 OFFSET $2
        `, [limit, offset]);

        const countRes = await query('SELECT COUNT(*)::int AS c FROM users');
        const total = countRes.rows[0]?.c ?? 0;

        const users = result.rows.map((r: {
            id: number; email: string; role: string;
            is_shadow_banned: boolean; cheating_flags: number; created_at: string;
            last_login_at: string | null; codeforces_handle: string | null;
            name: string | null; student_id: string | null; faculty: string | null;
            solved_count: number; total_submissions: number;
        }) => ({
            id: r.id,
            email: decrypt(r.email) || r.email,
            role: r.role || 'trainee',
            isVerified: true, // All users are verified via Supabase Auth
            isShadowBanned: r.is_shadow_banned,
            cheatingFlags: r.cheating_flags ?? 0,
            createdAt: r.created_at,
            lastLoginAt: r.last_login_at,
            codeforcesHandle: r.codeforces_handle,
            name: r.name,
            studentId: r.student_id,
            faculty: r.faculty,
            solvedCount: r.solved_count,
            totalSubmissions: r.total_submissions ?? 0
        }));

        return NextResponse.json({
            success: true,
            users,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        });
    } catch (error) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
