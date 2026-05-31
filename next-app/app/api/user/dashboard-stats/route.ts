import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/auth';
import { query } from '@/lib/db/db';
import { getCachedData } from '@/lib/cache/cache';
import { rateLimit } from '@/lib/cache/rate-limit';

const TIMEOUT_MS = 20000;

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
    maxStreak: 0,
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

        const ratelimit = await rateLimit(`dashboard_stats:${user.id}`, 10, 60);
        if (!ratelimit.success) {
            return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
        }

        const cacheKey = `user:${user.id}:dashboard_stats`;
        const statsData = await getCachedData(cacheKey, 300, async () => {
            try {
                return await withTimeout((async () => {
            // Run all 3 queries in parallel
            const [solvedResult, streakResult, activeSheetResult] = await Promise.all([
                // Query 1: All solved problems (Optimized: use user_progress instead of full submissions scan)
                query(`
                    SELECT problem_id AS problem_key, solved_at
                    FROM user_progress
                    WHERE user_id = $1 AND status = 'SOLVED'
                    ORDER BY solved_at ASC
                `, [user.id]),

                // Query 2: Read pre-computed streak from user_streaks
                query(`
                    SELECT current_streak, max_streak, last_solve_date
                    FROM user_streaks WHERE user_id = $1
                `, [user.id]),

                // Query 3: Current active sheet (Optimized: use sheet_id in user_progress for counting)
                query(`
                    WITH latest_activity AS (
                        SELECT sheet_id, MAX(submitted_at) AS last_active
                        FROM submissions
                        WHERE user_id = $1 AND sheet_id IS NOT NULL
                        GROUP BY sheet_id
                        ORDER BY last_active DESC
                        LIMIT 1
                    )
                    SELECT 
                        s.id AS sheet_id, s.sheet_letter, s.name AS sheet_name,
                        s.slug AS sheet_slug, s.total_problems,
                        l.slug AS level_slug, l.name AS level_name, la.last_active,
                        (SELECT COUNT(*)::int FROM user_progress WHERE user_id = $1 AND sheet_id = la.sheet_id AND status = 'SOLVED') AS solved_count
                    FROM latest_activity la
                    JOIN curriculum_sheets s ON s.id::text = la.sheet_id
                    JOIN curriculum_levels l ON s.level_id = l.id
                    GROUP BY s.id, s.sheet_letter, s.name, s.slug, s.total_problems,
                             l.slug, l.name, la.last_active, la.sheet_id
                `, [user.id])
            ]);

            const submissions = solvedResult.rows;
            const totalSolved = submissions.length;

            let streak = 0;
            let maxStreak = 0;
            if (streakResult.rows.length > 0) {
                const row = streakResult.rows[0];
                maxStreak = row.max_streak || 0;
                if (row.last_solve_date) {
                    const lastDate = new Date(row.last_solve_date).toISOString().split('T')[0];
                    const today = new Date().toISOString().split('T')[0];
                    const yesterdayDate = new Date();
                    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
                    const yesterday = yesterdayDate.toISOString().split('T')[0];
                    if (lastDate === today || lastDate === yesterday) {
                        streak = row.current_streak || 0;
                    }
                }
            }

            const consistencyMap: Record<string, number> = {};
            submissions.forEach((s: { solved_at: Date }) => {
                const date = new Date(s.solved_at).toISOString().split('T')[0];
                consistencyMap[date] = (consistencyMap[date] || 0) + 1;
            });

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
                    solvedCount: row.solved_count || 0,
                    lastActive: row.last_active
                };
            }

            return {
                streak,
                maxStreak,
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
