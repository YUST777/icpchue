import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth/auth';
import { query } from '@/lib/db/db';
import { getCachedData } from '@/lib/cache/cache';

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
        const range = Object.keys(SERIES_MAP).includes(rawRange) ? rawRange : '7d';
        const seriesInterval = SERIES_MAP[range];
        const cacheTtl = range === '1d' ? 60 : 300; // 1 min for today, 5 mins for others

        const statsData = await getCachedData(`admin:overview:${range}`, cacheTtl, async () => {
            const interval = INTERVAL_MAP[range];
            const hasInterval = !!interval;

            // ── Scalar stats (Total Users & Pending Apps) ──
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
                SELECT d.d::date AS day, COALESCE(s.cnt, 0)::int AS cnt
                FROM generate_series(NOW() - INTERVAL '${seriesInterval}', NOW(), '1 day'::interval) d
                LEFT JOIN (
                    SELECT DATE(submitted_at) AS day, COUNT(*) AS cnt
                    FROM submissions WHERE submitted_at > NOW() - INTERVAL '${seriesInterval}'
                    GROUP BY DATE(submitted_at)
                ) s ON s.day = d.d::date
                ORDER BY day ASC
            `);

            // ── Time-series: Cumulative total users by day (OPTIMIZED using Window Function) ──
            const totalUsersByDay = await query(`
                WITH daily_counts AS (
                    SELECT d.d::date AS day, COALESCE(u.cnt, 0) AS new_users
                    FROM generate_series(NOW() - INTERVAL '${seriesInterval}', NOW(), '1 day'::interval) d
                    LEFT JOIN (
                        SELECT DATE(created_at) AS day, COUNT(*) AS cnt
                        FROM users 
                        GROUP BY DATE(created_at)
                    ) u ON u.day = d.d::date
                ),
                historical_total AS (
                    SELECT COUNT(*) AS total FROM users WHERE created_at < NOW() - INTERVAL '${seriesInterval}'
                )
                SELECT day, 
                    (SUM(new_users) OVER (ORDER BY day ASC) + (SELECT total FROM historical_total))::int AS cnt
                FROM daily_counts
                ORDER BY day ASC
            `);

            // ── Time-series: Active users per day (distinct users who submitted) ──
            const activeUsersByDay = await query(`
                SELECT d.d::date AS day, COALESCE(s.cnt, 0)::int AS cnt
                FROM generate_series(NOW() - INTERVAL '${seriesInterval}', NOW(), '1 day'::interval) d
                LEFT JOIN (
                    SELECT DATE(submitted_at) AS day, COUNT(DISTINCT user_id)::int AS cnt
                    FROM submissions WHERE submitted_at > NOW() - INTERVAL '${seriesInterval}'
                    GROUP BY DATE(submitted_at)
                ) s ON s.day = d.d::date
                ORDER BY day ASC
            `);

            // ── Time-series: New users registered per day ──
            const newUsersByDay = await query(`
                SELECT d.d::date AS day, COALESCE(s.cnt, 0)::int AS cnt
                FROM generate_series(NOW() - INTERVAL '${seriesInterval}', NOW(), '1 day'::interval) d
                LEFT JOIN (
                    SELECT DATE(created_at) AS day, COUNT(*)::int AS cnt
                    FROM users WHERE created_at > NOW() - INTERVAL '${seriesInterval}'
                    GROUP BY DATE(created_at)
                ) s ON s.day = d.d::date
                ORDER BY day ASC
            `);

            // ── Verdict breakdown (period-scoped) ──
            const timeFilter = hasInterval ? `submitted_at > NOW() - INTERVAL '${interval}'` : 'TRUE';
            const verdictRaw = await query(`
                SELECT verdict, COUNT(*)::int AS cnt
                FROM submissions ${hasInterval ? `WHERE ${timeFilter}` : ''}
                GROUP BY verdict ORDER BY cnt DESC
            `);

            // ── Top sheets (OPTIMIZED using JOIN) ──
            const sheetsRes = await query(`
                SELECT s.id, s.name, s.slug, s.total_problems, l.slug AS level_slug,
                    COUNT(sub.id)::int AS activity
                FROM curriculum_sheets s
                JOIN curriculum_levels l ON l.id = s.level_id
                LEFT JOIN submissions sub ON sub.sheet_id = s.id::text AND sub.verdict = 'Accepted'
                GROUP BY s.id, s.name, s.slug, s.total_problems, l.slug
                ORDER BY activity DESC
                LIMIT 12
            `);

            // ── Format responses ──
            const fmtSeries = (rows: any[]) =>
                rows.map(r => ({ day: r.day, count: parseInt(r.cnt) || 0 }));

            const verdictBreakdown = verdictRaw.rows.map((r: any) => ({
                verdict: r.verdict, count: r.cnt || 0
            }));

            const topSheets = sheetsRes.rows.map((r: any) => ({
                id: r.id, name: r.name, slug: r.slug, levelSlug: r.level_slug,
                totalProblems: r.total_problems ?? 0, activity: r.activity || 0
            }));

            const submissionsSeries = fmtSeries(submissionsByDay.rows);
            const totalSubsInPeriod = submissionsSeries.reduce((a, b) => a + b.count, 0);
            const todaySubmissions = submissionsSeries.length > 0 ? submissionsSeries[submissionsSeries.length - 1].count : 0;

            const activeUsersSeries = fmtSeries(activeUsersByDay.rows);
            const activeScalar = (await query(`
                SELECT COUNT(DISTINCT user_id)::int AS c 
                FROM submissions 
                ${hasInterval ? `WHERE ${timeFilter}` : ''}
            `)).rows[0]?.c ?? 0;

            const newUsersSeries = fmtSeries(newUsersByDay.rows);
            const totalNewInPeriod = newUsersSeries.reduce((a, b) => a + b.count, 0);

            return {
                range,
                totalUsers: usersRes.rows[0]?.c ?? 0,
                totalSubmissions: totalSubsInPeriod,
                submissionsToday: todaySubmissions,
                activeUsers: activeScalar,
                newUsers: totalNewInPeriod,
                appsPendingAccount: appsPendingRes.rows[0]?.c ?? 0,
                shadowBannedCount: shadowBannedRes.rows[0]?.c ?? 0,
                submissionsByDay: submissionsSeries,
                totalUsersByDay: fmtSeries(totalUsersByDay.rows),
                activeUsersByDay: activeUsersSeries,
                newUsersByDay: newUsersSeries,
                verdictBreakdown,
                topSheets
            };
        });

        return NextResponse.json({
            success: true,
            ...statsData
        });
    } catch (error) {
        console.error('[AdminOverview] Error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
