import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth/auth';
import { rateLimit } from '@/lib/cache/rate-limit';
import { query } from '@/lib/db/db';
import { decrypt } from '@/lib/security/encryption';

// Decrypting national IDs/phones (cryptr, ~60ms each) for up to 100 rows.
export const maxDuration = 60;

function csvCell(value: unknown): string {
    const s = value == null ? '' : String(value);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * GET /api/admin/export/top-active?limit=40
 * Owner-only CSV of the most active trainees with contact details. The data
 * is encrypted with a key that only exists in production, so the export has
 * to be produced here. Every export is logged.
 */
export async function GET(req: NextRequest) {
    const user = await verifyAdmin(req);
    if (!user || user.role !== 'owner') {
        return NextResponse.json({ error: 'Owner access required' }, { status: 403 });
    }
    const rl = await rateLimit(`export-top-active:${user.id}`, 5, 600);
    if (!rl.success) return NextResponse.json({ error: 'Too many exports, try again later' }, { status: 429 });

    const limit = Math.min(100, Math.max(1, parseInt(new URL(req.url).searchParams.get('limit') || '40', 10) || 40));

    // Most active = distinct problems solved, then submissions, then active
    // days in the last 30 days, then most recent activity.
    const { rows } = await query(`
        WITH t AS (SELECT * FROM users WHERE role NOT IN ('mentor', 'instructor', 'owner') OR role IS NULL),
        solved AS (
            SELECT user_id, COUNT(DISTINCT key) AS n FROM (
                SELECT user_id, problem_id AS key FROM user_progress WHERE status = 'SOLVED'
                UNION
                SELECT user_id, contest_id::text || ':' || UPPER(problem_index) FROM submissions
                 WHERE verdict ILIKE '%accept%' OR LOWER(verdict) IN ('ok', 'ac')
            ) x GROUP BY user_id
        ),
        subs AS (
            SELECT user_id, COUNT(*) AS n, MAX(submitted_at) AS last,
                   COUNT(DISTINCT submitted_at::date) FILTER (WHERE submitted_at > now() - interval '30 days') AS days30
              FROM submissions GROUP BY user_id
        )
        SELECT t.id, t.codeforces_handle, a.name, a.national_id, a.telephone, a.student_level, a.student_id, a.faculty,
               COALESCE(s.n, 0)::int AS solved, COALESCE(b.n, 0)::int AS submissions,
               COALESCE(b.days30, 0)::int AS active_days_30, GREATEST(b.last, t.last_login_at) AS last_active
          FROM t
          LEFT JOIN applications a ON a.id = t.application_id
          LEFT JOIN solved s ON s.user_id = t.id
          LEFT JOIN subs b ON b.user_id = t.id
         ORDER BY solved DESC, submissions DESC, active_days_30 DESC, last_active DESC NULLS LAST
         LIMIT $1
    `, [limit]);

    const header = ['Rank', 'Name', 'National ID', 'Telephone', 'Student Level', 'Student ID', 'Faculty', 'Codeforces', 'Problems Solved', 'Submissions', 'Active Days (30d)', 'Last Active'];
    const lines = rows.map((r: Record<string, unknown>, i: number) => [
        i + 1,
        decrypt(r.name as string) || r.codeforces_handle || '',
        decrypt(r.national_id as string) || '',
        decrypt(r.telephone as string) || '',
        r.student_level || '',
        decrypt(r.student_id as string) || '',
        r.faculty || '',
        r.codeforces_handle || '',
        r.solved,
        r.submissions,
        r.active_days_30,
        r.last_active ? new Date(r.last_active as string).toISOString().slice(0, 10) : '',
    ].map(csvCell).join(','));

    console.warn(`[Admin Export] top-active (${rows.length} rows with national IDs/phones) downloaded by user ${user.id}`);

    // BOM so Excel opens Arabic names correctly.
    const csv = '﻿' + [header.join(','), ...lines].join('\r\n');
    return new NextResponse(csv, {
        headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="icpchue-top-${rows.length}-active-${new Date().toISOString().slice(0, 10)}.csv"`,
            'Cache-Control': 'no-store, private',
        },
    });
}
