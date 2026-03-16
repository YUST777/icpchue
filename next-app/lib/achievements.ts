import { query, withTransaction } from './db';
import { invalidateCache } from './cache';

export const ACHIEVEMENTS = {
    WELCOME: 'welcome',
    APPROVAL: 'approval',
    SHEET_1: 'sheet-1',
    RANK_500: '500pts',
    INSTRUCTOR: 'instructor',
    RANK1_MARCH_2026: 'rank1-march-2026'
};

/**
 * Grants an achievement to a user if they don't already have it.
 * Also handles updating the 'seen' status logic if needed.
 */
export async function grantAchievement(userId: number | string, achievementId: string) {
    try {
        // 1. Insert into user_achievements if user is not flagged
        const result = await query(
            `INSERT INTO user_achievements (user_id, achievement_id, earned_at, seen)
             SELECT $1, $2, NOW(), FALSE
             WHERE EXISTS (
                 SELECT 1 FROM users 
                 WHERE id = $1 
                 AND is_shadow_banned = FALSE 
                 AND cheating_flags = 0
             )
             ON CONFLICT (user_id, achievement_id) DO NOTHING
             RETURNING id`,
            [userId, achievementId]
        );

        const wasGranted = result.rows.length > 0;

        if (wasGranted) {
            console.log(`[Achievement] User ${userId} earned: ${achievementId}`);
            await invalidateCache(`user:${userId}:achievements`);
            await invalidateCache(`user:${userId}:dashboard_stats`);
        }

        return wasGranted;
    } catch (error) {
        console.error(`[Achievement Error] Failed to grant ${achievementId} to ${userId}:`, error);
        return false;
    }
}

/**
 * Updates a boolean status flag on the users table and potentially grants an achievement.
 */
export async function updateUserStatus(userId: number | string, field: 'sheet_1_solved' | 'is_approval_unlocked', value: boolean) {
    try {
        await query(
            `UPDATE users SET ${field} = $1 WHERE id = $2`,
            [value, userId]
        );

        if (value) {
            const achievementId = field === 'sheet_1_solved' ? ACHIEVEMENTS.SHEET_1 : ACHIEVEMENTS.APPROVAL;
            await grantAchievement(userId, achievementId);
        }
    } catch (error) {
        console.error(`[Status Update Error] Failed to update ${field} for user ${userId}:`, error);
    }
}

/**
 * Creates a notification for a user.
 */
export async function createNotification(userId: number | string, title: string, message: string, type: 'achievement' | 'leaderboard' | 'system' = 'system') {
    try {
        await query(
            `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)`,
            [userId, title, message, type]
        );
    } catch (error) {
        console.error(`[Notification Error] Failed to create notification for ${userId}:`, error);
    }
}

/**
 * Synchronizes the March 2026 Rank 1 achievement and logs the movement.
 * Hardened version with transactions, deterministic sorting, and privacy filters.
 */
export async function syncRank1Achievement(triggerType: string) {
    // Campaign ends April 1st, 2026 (UTC)
    const campaignEnd = new Date('2026-04-01T00:00:00Z');
    if (new Date() >= campaignEnd) return;

    try {
        await withTransaction(async (client) => {
            // 1. Advisory Lock to prevent concurrent syncs for the same campaign
            await client.query('SELECT pg_advisory_xact_lock(202603)');

            // 2. Get the current Rank 1 holder
            // Tie-breaking logic:
            // 1. solved_count DESC (most problems)
            // 2. total_submissions ASC (efficiency/fewer attempts)
            // 3. min_submitted_at ASC (first to reach this solve count)
            const leaderboardResult = await client.query(`
                WITH all_solves AS (
                    SELECT user_id, contest_id || '-' || problem_index AS problem_key, submitted_at
                    FROM cf_submissions
                    WHERE verdict = 'Accepted'
                ),
                user_stats AS (
                    SELECT 
                        user_id,
                        COUNT(DISTINCT problem_key) AS solved_count,
                        MIN(submitted_at) AS first_solve_at,
                        MAX(submitted_at) AS last_solve_at
                    FROM all_solves
                    GROUP BY user_id
                ),
                sub_counts AS (
                    SELECT user_id, COUNT(*)::int AS total_submissions
                    FROM cf_submissions
                    GROUP BY user_id
                )
                SELECT u.id
                FROM users u
                INNER JOIN user_stats us ON u.id = us.user_id
                LEFT JOIN sub_counts sc ON u.id = sc.user_id
                WHERE (u.is_shadow_banned = FALSE OR u.is_shadow_banned IS NULL)
                  AND (u.show_on_sheets_leaderboard = TRUE OR u.show_on_sheets_leaderboard IS NULL OR u.is_shadow_banned = TRUE)
                ORDER BY us.solved_count DESC, COALESCE(sc.total_submissions, 0) ASC, us.last_solve_at ASC
                LIMIT 1
            `);

            if (leaderboardResult.rows.length === 0) return;
            const currentLeaderId = leaderboardResult.rows[0].id;

            // 3. Find the previous holder of the achievement (using FOR UPDATE to prevent race conditions)
            const prevHolderId = (await client.query(
                `SELECT user_id FROM user_achievements WHERE achievement_id = $1 FOR UPDATE`,
                [ACHIEVEMENTS.RANK1_MARCH_2026]
            )).rows[0]?.user_id;

            // 4. If the leader has changed
            if (currentLeaderId !== prevHolderId) {
                console.log(`[Campaign] Rank 1 movement: ${prevHolderId || 'NONE'} -> ${currentLeaderId} via ${triggerType}`);

                // Log the change in history
                await client.query(
                    `INSERT INTO leaderboard_rank1_history (user_id, previous_user_id, trigger_type) VALUES ($1, $2, $3)`,
                    [currentLeaderId, prevHolderId || null, triggerType]
                );

                // Notify OLD leader (if any)
                if (prevHolderId) {
                    await client.query(
                        `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)`,
                        [prevHolderId, 'T-Shirt Lost!', 'Someone just overtook your Rank 1 spot. Get back to work to reclaim your T-shirt!', 'leaderboard']
                    );
                }

                // Notify NEW leader
                await client.query(
                    `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)`,
                    [currentLeaderId, 'T-Shirt Acquired!', "You've taken the lead in the March Campaign! Keep it until April to win the T-shirt.", 'leaderboard']
                );

                // Check if this user has ever held Rank 1 before (anti-spam check on the big pop-up)
                const historyCheck = await client.query(
                    `SELECT 1 FROM leaderboard_rank1_history WHERE user_id = $1 AND previous_user_id != $1 LIMIT 1 OFFSET 1`,
                    [currentLeaderId]
                );
                const hasHeldBefore = historyCheck.rows.length > 0;

                // Transfer the Achievement (Atomic deletion and insertion)
                await client.query(
                    `DELETE FROM user_achievements WHERE achievement_id = $1`,
                    [ACHIEVEMENTS.RANK1_MARCH_2026]
                );

                await client.query(
                    `INSERT INTO user_achievements (user_id, achievement_id, earned_at, seen)
                     VALUES ($1, $2, NOW(), $3)`,
                    [currentLeaderId, ACHIEVEMENTS.RANK1_MARCH_2026, hasHeldBefore]
                );

                // Global cache invalidation
                await invalidateCache('leaderboard:sheets:public');
                if (prevHolderId) {
                    await invalidateCache(`user:${prevHolderId}:achievements`);
                    await invalidateCache(`user:${prevHolderId}:dashboard_stats`);
                }
                await invalidateCache(`user:${currentLeaderId}:achievements`);
                await invalidateCache(`user:${currentLeaderId}:dashboard_stats`);
            }
        });
    } catch (error) {
        console.error('[Campaign Error] syncRank1Achievement failed:', error);
    }
}
