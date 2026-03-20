import { query, withTransaction } from './db';
import { invalidateCache } from './cache';

/**
 * Updates a user's daily solve count and streak.
 * This should be called whenever a submission is marked 'Accepted'.
 */
export async function updateStreakOnSolve(userId: number | string) {
    try {
        const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        await withTransaction(async (client) => {
            // 1. Increment today's solve count
            await client.query(`
                INSERT INTO public.daily_solves (user_id, solve_date, solve_count, updated_at)
                VALUES ($1, $2, 1, NOW())
                ON CONFLICT (user_id, solve_date) 
                DO UPDATE SET solve_count = public.daily_solves.solve_count + 1, updated_at = NOW()
            `, [userId, todayStr]);

            // 2. Fetch current streak data
            const streakResult = await client.query(
                `SELECT current_streak, last_solve_date FROM public.user_streaks WHERE user_id = $1 FOR UPDATE`,
                [userId]
            );

            let currentStreak = 0;
            let lastSolveDate = null;

            if (streakResult.rows.length > 0) {
                currentStreak = streakResult.rows[0].current_streak;
                const lastDateObj = new Date(streakResult.rows[0].last_solve_date);
                lastSolveDate = lastDateObj.toISOString().split('T')[0];
            } else {
                // Initialize user streak record
                await client.query(
                    `INSERT INTO public.user_streaks (user_id, current_streak, last_solve_date, updated_at) VALUES ($1, 0, NULL, NOW())`,
                    [userId]
                );
            }

            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            let newStreak = currentStreak;

            if (lastSolveDate === todayStr) {
                // Already solved today, streak stays the same (but we already incremented solve_count)
            } else if (lastSolveDate === yesterdayStr) {
                // Last solve was yesterday, increment streak
                newStreak = currentStreak + 1;
            } else {
                // Streak broken or new user, reset to 1
                newStreak = 1;
            }

            // 3. Update user_streaks table
            await client.query(`
                UPDATE public.user_streaks 
                SET current_streak = $1, 
                    max_streak = GREATEST(max_streak, $1), 
                    last_solve_date = $2, 
                    updated_at = NOW()
                WHERE user_id = $3
            `, [newStreak, todayStr, userId]);
        });

        // Invalidate relevant caches
        await invalidateCache(`user:${userId}:streak`);
        await invalidateCache(`user:${userId}:dashboard_stats`);

    } catch (error) {
        console.error('[Streak Update Error] Failed to update streak for user:', userId, error);
    }
}

/**
 * Gets a user's current streak and today's solve count.
 */
export async function getUserStreak(userId: number | string) {
    try {
        const todayStr = new Date().toISOString().split('T')[0];

        const [streakRes, solvesRes] = await Promise.all([
            query(`SELECT current_streak, max_streak, last_solve_date FROM public.user_streaks WHERE user_id = $1`, [userId]),
            query(`SELECT solve_count FROM public.daily_solves WHERE user_id = $1 AND solve_date = $2`, [userId, todayStr])
        ]);

        const streakData = streakRes.rows[0] || { current_streak: 0, max_streak: 0, last_solve_date: null };
        
        // Handle streak reset if they missed yesterday
        // Note: We don't update the DB here (it's a READ operation), we just compute it for display.
        // The DB will reset it on the next SOLVE attempt.
        let displayStreak = 0;
        if (streakData.last_solve_date) {
            const lastDate = new Date(streakData.last_solve_date);
            const lastDateStr = lastDate.toISOString().split('T')[0];
            
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            if (lastDateStr === todayStr || lastDateStr === yesterdayStr) {
                displayStreak = streakData.current_streak;
            }
        }

        return {
            streak: displayStreak,
            maxStreak: streakData.max_streak,
            todaySolves: solvesRes.rows[0]?.solve_count || 0,
            lastSolveDate: streakData.last_solve_date
        };
    } catch (error) {
        console.error('[Get Streak Error] Failed to fetch streak for user:', userId, error);
        return { streak: 0, maxStreak: 0, todaySolves: 0 };
    }
}
