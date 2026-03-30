import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth/auth';
import { query } from '@/lib/db/db';

const INTERVAL_MAP: Record<string, string> = {
    '1d': '1 day',
    '7d': '7 days',
    '14d': '14 days',
    '1m': '1 month',
};

const SERIES_MAP: Record<string, string> = {
    '1d': '1 day',
    '7d': '7 days',
    '14d': '14 days',
    '1m': '30 days',
    'all': '90 days',
};

export async function GET(req: NextRequest) {
    try {
        const admin = await verifyAdmin(req);
        if (!admin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const rawRange = searchParams.get('range') || '7d';
        const range = Object.keys(INTERVAL_MAP).includes(rawRange) || rawRange === 'all' ? rawRange : '7d';
        const interval = INTERVAL_MAP[range];
        const hasInterval = !!interval;

        const seriesInterval = SERIES_MAP[range] || '7 days';

        // ── Scalar stats (always all-time for Total Users & Pending Apps) ──
        const [
            usersRes,
            appsPendingRes,
            shadowBannedRes,
        ] = await Promise.all([
            query('SELECT COUNT(*)::int AS c FROM users'),
            query(`
                SELECT COUNT(*)::int AS c FROM applications a
                WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.application_id = a.id)
            `),
            query('SELECT COUNT(*)::int AS c FROM users WHERE is_shadow_banned = true'),
        ]);

        // ── Time-series: Submissions per day ──
        const submissionsByDay = await query(`
            SELECT d.d::date AS day, COALESCE(SUM(cnt), 0)::int AS cnt
            FROM generate_series(NOW() - INTERVAL '${seriesInterval}', NOW(), '1 day'::interval) d
            LEFT JOIN (
                SELECT DATE(submitted_at) AS day, COUNT(*) AS cnt
                FROM (
                    SELECT submitted_at FROM training_submissions WHERE submitted_at > NOW() - INTERVAL '${seriesInterval}'
                    UNION ALL
                    SELECT submitted_at FROM cf_submissions WHERE submitted_at > NOW() - INTERVAL '${seriesInterval}'
                ) t
                GROUP BY DATE(submitted_at)
            ) s ON s.day = d.d::date
            GROUP BY d.d::date
            ORDER BY day ASC
        `);

        // ── Time-series: Cumulative total users by day ──
        const totalUsersByDay = await query(`
            SELECT d.d::date AS day,
                (SELECT COUNT(*)::int FROM users WHERE created_at::date <= d.d::date) AS cnt
            FROM generate_series(NOW() - INTERVAL '${seriesInterval}', NOW(), '1 day'::interval) d
            ORDER BY day ASC
        `);

        // ── Time-series: Active users per day (distinct users who submitted) ──
        const activeUsersByDay = await query(`
            SELECT d.d::date AS day, COALESCE(cnt, 0)::int AS cnt
            FROM generate_series(NOW() - INTERVAL '${seriesInterval}', NOW(), '1 day'::interval) d
            LEFT JOIN (
                SELECT day, COUNT(DISTINCT user_id)::int AS cnt FROM (
                    SELECT DATE(submitted_at) AS day, user_id FROM training_submissions WHERE submitted_at > NOW() - INTERVAL '${seriesInterval}'
                    UNION ALL
                    SELECT DATE(submitted_at), user_id FROM cf_submissions WHERE submitted_at > NOW() - INTERVAL '${seriesInterval}'
                ) t GROUP BY day
            ) s ON s.day = d.d::date
            ORDER BY day ASC
        `);

        // ── Time-series: New users registered per day ──
        const newUsersByDay = await query(`
            SELECT d.d::date AS day, COALESCE(cnt, 0)::int AS cnt
            FROM generate_series(NOW() - INTERVAL '${seriesInterval}', NOW(), '1 day'::interval) d
            LEFT JOIN (
                SELECT DATE(created_at) AS day, COUNT(*)::int AS cnt
                FROM users WHERE created_at > NOW() - INTERVAL '${seriesInterval}'
                GROUP BY DATE(created_at)
            ) s ON s.day = d.d::date
            ORDER BY day ASC
        `);

        // ── Time-series: Daily submissions (today = last day value) ──
        // Already covered by submissionsByDay

        // ── Verdict breakdown (period-scoped) ──
        const timeFilter = hasInterval ? `submitted_at > NOW() - INTERVAL '${interval}'` : 'TRUE';
        const verdictRaw = await query(`
            SELECT verdict, SUM(cnt)::int AS cnt FROM (
                SELECT verdict, COUNT(*) AS cnt FROM training_submissions ${hasInterval ? `WHERE ${timeFilter}` : ''} GROUP BY verdict
                UNION ALL
                SELECT verdict, COUNT(*) FROM cf_submissions ${hasInterval ? `WHERE ${timeFilter}` : ''} GROUP BY verdict
            ) t GROUP BY verdict ORDER BY cnt DESC
        `);

        // ── Top sheets ──
        const sheetsRes = await query(`
            SELECT s.id, s.name, s.slug, s.total_problems, l.slug AS level_slug,
                (SELECT COUNT(*) FROM training_submissions ts WHERE ts.sheet_id::text = s.id::text AND ts.verdict = 'Accepted') +
                COALESCE((SELECT COUNT(*) FROM cf_submissions cf WHERE cf.sheet_id::text = s.id::text AND cf.verdict = 'Accepted'), 0) AS activity
            FROM curriculum_sheets s
            JOIN curriculum_levels l ON l.id = s.level_id
            ORDER BY activity DESC
            LIMIT 12
        `);

        // ── Format responses ──
        const fmtSeries = (rows: { day: string; cnt: string }[]) =>
            rows.map(r => ({ day: r.day, count: parseInt(r.cnt) || 0 }));

        const verdictBreakdown = verdictRaw.rows.map((r: { verdict: string; cnt: string }) => ({
            verdict: r.verdict, count: parseInt(r.cnt) || 0
        }));

        const topSheets = sheetsRes.rows.map((r: Record<string, unknown>) => ({
            id: r.id, name: r.name, slug: r.slug, levelSlug: r.level_slug,
            totalProblems: r.total_problems ?? 0, activity: parseInt(String(r.activity)) || 0
        }));

        // Compute period totals from series
        const submissionsSeries = fmtSeries(submissionsByDay.rows);
        const totalSubsInPeriod = submissionsSeries.reduce((a, b) => a + b.count, 0);
        const todaySubmissions = submissionsSeries.length > 0 ? submissionsSeries[submissionsSeries.length - 1].count : 0;

        const activeUsersSeries = fmtSeries(activeUsersByDay.rows);
        const totalActiveInPeriod = new Set(activeUsersSeries.flatMap(() => [])).size; // We need the scalar
        const activeScalar = hasInterval
            ? (await query(`SELECT COUNT(DISTINCT user_id)::int AS c FROM (
                SELECT user_id FROM training_submissions WHERE ${timeFilter}
                UNION SELECT user_id FROM cf_submissions WHERE ${timeFilter}
              ) AS active`)).rows[0]?.c ?? 0
            : (await query(`SELECT COUNT(DISTINCT user_id)::int AS c FROM (
                SELECT user_id FROM training_submissions
                UNION SELECT user_id FROM cf_submissions
              ) AS active`)).rows[0]?.c ?? 0;

        const newUsersSeries = fmtSeries(newUsersByDay.rows);
        const totalNewInPeriod = newUsersSeries.reduce((a, b) => a + b.count, 0);

        return NextResponse.json({
            success: true,
            range,
            // Scalar values
            totalUsers: usersRes.rows[0]?.c ?? 0,
            totalSubmissions: totalSubsInPeriod,
            submissionsToday: todaySubmissions,
            activeUsers: activeScalar,
            newUsers: totalNewInPeriod,
            appsPendingAccount: appsPendingRes.rows[0]?.c ?? 0,
            shadowBannedCount: shadowBannedRes.rows[0]?.c ?? 0,
            // Time series for charts
            submissionsByDay: submissionsSeries,
            totalUsersByDay: fmtSeries(totalUsersByDay.rows),
            activeUsersByDay: activeUsersSeries,
            newUsersByDay: newUsersSeries,
            // Breakdowns
            verdictBreakdown,
            topSheets
        });
    } catch (error) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
