import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/auth';
import { query } from '@/lib/db/db';
import { getCachedData } from '@/lib/cache/cache';
import { rateLimit } from '@/lib/cache/rate-limit';

const TIMEOUT_MS = 20000; // 20s - avoid gateway 504 (typically 60-100s)

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('Stats fetch timeout')), ms);
        promise.then(
            (v) => { clearTimeout(t); resolve(v); },
            (e) => { clearTimeout(t); reject(e); }
        );
    });
}

const FALLBACK_STATS = {
    streak: 0,
    totalSolved: 0,
    consistencyMap: {} as Record<string, number>,
    currentSheet: null
};

export async function GET(request: NextRequest) {
    try {
        const user = await verifyAuth(request);
        if (!user) {
            return NextResponse.json({ error: 'No token provided' }, { status: 401 });
        }

        // Rate limit: 10 per 60s per user
        const ratelimit = await rateLimit(`dashboard_stats:${user.id}`, 10, 60);
        if (!ratelimit.success) {
            return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
        }

        const cacheKey = `user:${user.id}:dashboard_stats`;
        // Cache stats for 5 minutes (300 seconds)
        const statsData = await getCachedData(cacheKey, 300, async () => {
            try {
                return await withTimeout((async () => {
            // Single query: get ALL solved problems from BOTH Judge0 and Codeforces
            const result = await query(`
                SELECT DISTINCT problem_key, MIN(solved_at) AS solved_at
                FROM (
                    SELECT 
                        COALESCE(cf.contest_id, '') || ':' || cf.problem_index AS problem_key,
                        cf.submitted_at AS solved_at
                    FROM cf_submissions cf
                    WHERE cf.user_id = $1 AND cf.verdict = 'Accepted'
                ) AS all_solved
                GROUP BY problem_key
                ORDER BY solved_at ASC
            `, [user.id]);

            const submissions = result.rows;
            const totalSolved = submissions.length;

            // Streak Calculation
            const uniqueDates = Array.from(new Set(
                submissions.map((s: { solved_at: Date }) => {
                    const date = new Date(s.solved_at);
                    return date.toISOString().split('T')[0];
                })
            )).sort().reverse() as string[];

            let streak = 0;
            const today = new Date().toISOString().split('T')[0];
            const yesterdayDate = new Date();
            yesterdayDate.setDate(yesterdayDate.getDate() - 1);
            const yesterday = yesterdayDate.toISOString().split('T')[0];

            let currentDateCheck = today;
            if (!uniqueDates.includes(today)) {
                if (uniqueDates.includes(yesterday)) {
                    currentDateCheck = yesterday;
                }
            }

            if (uniqueDates.includes(currentDateCheck)) {
                streak = 1;
                const checkDate = new Date(currentDateCheck);
                for (let i = 1; i < uniqueDates.length; i++) {
                    checkDate.setDate(checkDate.getDate() - 1);
                    const checkString = checkDate.toISOString().split('T')[0];
                    if (uniqueDates.includes(checkString)) {
                        streak++;
                    } else {
                        break;
                    }
                }
            }

            // Consistency Data (for heatmap)
            const consistencyMap: Record<string, number> = {};
            submissions.forEach((s: { solved_at: Date }) => {
                const date = new Date(s.solved_at).toISOString().split('T')[0];
                consistencyMap[date] = (consistencyMap[date] || 0) + 1;
            });

            // Current active sheet: the sheet the user has most recently submitted to
            const activeSheetResult = await query(`
                WITH latest_activity AS (
                    SELECT sheet_id, MAX(submitted_at) AS last_active
                    FROM (
                        SELECT sheet_id::text, submitted_at FROM training_submissions WHERE user_id = $1
                        UNION ALL
                        SELECT sheet_id::text, submitted_at FROM cf_submissions WHERE user_id = $1 AND sheet_id IS NOT NULL
                    ) AS all_subs
                    WHERE sheet_id IS NOT NULL
                    GROUP BY sheet_id
                    ORDER BY last_active DESC
                    LIMIT 1
                )
                SELECT 
                    s.id AS sheet_id,
                    s.sheet_letter,
                    s.name AS sheet_name,
                    s.slug AS sheet_slug,
                    s.total_problems,
                    l.slug AS level_slug,
                    l.name AS level_name,
                    la.last_active,
                    COUNT(DISTINCT CASE WHEN up.status = 'SOLVED' THEN p.id END) AS solved_count
                FROM latest_activity la
                JOIN curriculum_sheets s ON s.id::text = la.sheet_id
                JOIN curriculum_levels l ON s.level_id = l.id
                LEFT JOIN curriculum_problems p ON p.sheet_id = s.id
                LEFT JOIN user_progress up 
                    ON up.problem_id = (s.contest_id || ':' || p.problem_letter)
                    AND up.user_id = $1
                GROUP BY s.id, s.sheet_letter, s.name, s.slug, s.total_problems,
                         l.slug, l.name, la.last_active
            `, [user.id]);

            let currentSheet = null;
            if (activeSheetResult.rows.length > 0) {
                const row = activeSheetResult.rows[0];
                currentSheet = {
                    id: row.sheet_id,
                    letter: row.sheet_letter,
                    name: row.sheet_name,
                    slug: row.sheet_slug,
                    levelSlug: row.level_slug,
                    levelName: row.level_name,
                    totalProblems: parseInt(row.total_problems) || 0,
                    solvedCount: parseInt(row.solved_count) || 0,
                    lastActive: row.last_active
                };
            }

            return {
                streak,
                totalSolved,
                consistencyMap,
                currentSheet
            };
        })(), TIMEOUT_MS);
            } catch (err) {
                if (err instanceof Error && err.message === 'Stats fetch timeout') {
                    return FALLBACK_STATS;
                }
                throw err;
            }
        });

        return NextResponse.json(statsData);

    } catch (error) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
