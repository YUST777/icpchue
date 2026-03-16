import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { query } from '@/lib/db';

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

        const result = await query(`
            SELECT * FROM (
                SELECT ts.id, ts.user_id, ts.sheet_id, ts.problem_id, ts.verdict, ts.time_ms, ts.memory_kb,
                    ts.time_to_solve_seconds, ts.attempt_number, ts.submitted_at, ts.language, 'judge0' AS source,
                    a.name AS user_name, cs.name AS sheet_name
                FROM training_submissions ts
                LEFT JOIN users u ON u.id = ts.user_id
                LEFT JOIN applications a ON a.id = u.application_id
                LEFT JOIN curriculum_sheets cs ON cs.id::text = ts.sheet_id::text
                UNION ALL
                SELECT cf.id, cf.user_id, cf.sheet_id, cf.contest_id || '-' || cf.problem_index AS problem_id,
                    cf.verdict, cf.time_ms, cf.memory_kb, NULL::int AS time_to_solve_seconds, NULL::int AS attempt_number,
                    cf.submitted_at, cf.language, 'codeforces' AS source,
                    a.name AS user_name, cs.name AS sheet_name
                FROM cf_submissions cf
                LEFT JOIN users u ON u.id = cf.user_id
                LEFT JOIN applications a ON a.id = u.application_id
                LEFT JOIN curriculum_sheets cs ON cs.id::text = cf.sheet_id::text
            ) AS unified
            ORDER BY submitted_at DESC
            LIMIT $1 OFFSET $2
        `, [limit, offset]);

        const countRes = await query(`
            SELECT (
                (SELECT COUNT(*) FROM training_submissions) +
                (SELECT COUNT(*) FROM cf_submissions)
            )::bigint AS total
        `);
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
