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
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '30')));
        const offset = (page - 1) * limit;

        // Single query on unified submissions table — no more UNION ALL
        const result = await query(`
            SELECT s.id, s.user_id, s.sheet_id,
                CASE WHEN s.source = 'codeforces' THEN s.contest_id || '-' || s.problem_index ELSE s.problem_index END AS problem_id,
                s.verdict, s.time_ms, s.memory_kb,
                s.time_to_solve_seconds, s.attempt_number, s.submitted_at, s.language, s.source,
                a.name AS user_name, cs.name AS sheet_name
            FROM submissions s
            LEFT JOIN users u ON u.id = s.user_id
            LEFT JOIN applications a ON a.id = u.application_id
            LEFT JOIN curriculum_sheets cs ON cs.id::text = s.sheet_id
            ORDER BY s.submitted_at DESC
            LIMIT $1 OFFSET $2
        `, [limit, offset]);

        const countRes = await query('SELECT COUNT(*)::bigint AS total FROM submissions');
        const total = parseInt(countRes.rows[0]?.total ?? '0');

        const submissions = result.rows.map((r: Record<string, unknown>) => ({
            id: r.id,
            userId: r.user_id,
            userName: r.user_name,
            sheetId: r.sheet_id,
            sheetName: r.sheet_name,
            problemId: r.problem_id,
            verdict: r.verdict,
            timeMs: r.time_ms,
            memoryKb: r.memory_kb,
            timeToSolveSeconds: r.time_to_solve_seconds,
            attemptNumber: r.attempt_number,
            submittedAt: r.submitted_at,
            language: r.language,
            source: r.source
        }));

        return NextResponse.json({
            success: true,
            submissions,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        });
    } catch (error) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
