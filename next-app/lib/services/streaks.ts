import { query } from '../db/db';
import { invalidateCache } from '../cache/cache';

/**
 * Called whenever a submission is marked 'Accepted'.
 *
 * Solve days and streaks are derived by the database itself: triggers on
 * `submissions` call recompute_solve_days() using Cairo-time days, one row per
 * season. Writing to those tables here as well (with UTC days) double-counted
 * solves and overwrote the correct streak, so this only refreshes the caches.
 */
export async function updateStreakOnSolve(userId: number | string) {
    try {
        await invalidateCache(`user:${userId}:streak`);
        await invalidateCache(`user:${userId}:dashboard_stats`);
    } catch (error) {
        console.error('[Streak Update Error] Failed to refresh streak caches for user:', userId, error);
    }
}

/**
 * Gets a user's current streak and today's solve count.
 */
export async function getUserStreak(userId: number | string) {
    try {
        // Days are Cairo days, the same as the database triggers that write these tables.
        // A streak is alive if the last solve was today or yesterday; otherwise it shows 0.
        const [streakRes, solvesRes] = await Promise.all([
            query(`
                SELECT COALESCE(MAX(current_streak) FILTER (WHERE last_solve_date >= (now() AT TIME ZONE 'Africa/Cairo')::date - 1), 0)::int AS streak,
                       COALESCE(MAX(max_streak), 0)::int AS max_streak,
                       to_char(MAX(last_solve_date), 'YYYY-MM-DD') AS last_solve_date
                  FROM public.user_streaks WHERE user_id = $1
            `, [userId]),
            query(`
                SELECT COALESCE(SUM(solve_count), 0)::int AS solve_count
                  FROM public.daily_solves
                 WHERE user_id = $1 AND solve_date = (now() AT TIME ZONE 'Africa/Cairo')::date
            `, [userId])
        ]);

        const row = streakRes.rows[0];
        return {
            streak: row?.streak ?? 0,
            maxStreak: row?.max_streak ?? 0,
            todaySolves: solvesRes.rows[0]?.solve_count ?? 0,
            lastSolveDate: row?.last_solve_date ?? null
        };
    } catch (error) {
        console.error('[Get Streak Error] Failed to fetch streak for user:', userId, error);
        return { streak: 0, maxStreak: 0, todaySolves: 0, lastSolveDate: null };
    }
}
