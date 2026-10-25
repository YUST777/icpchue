import { query, withTransaction } from '../db/db';
import { invalidateCache } from '../cache/cache';
import { CF_RANK_BADGES } from '../achievements/catalog';
import { ecpcTeamUserIds } from '../leaderboard/cohort';
import { STREAK_TIERS } from '../achievements/catalog';

export const ACHIEVEMENTS = {
    WELCOME: 'welcome',
    APPROVAL: 'approval',
    SHEET_1: 'sheet-1',
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

/** Codeforces rank badges for a best rating: every rank up to it, as a collection. */
export async function grantCodeforcesRankBadges(userId: number | string, bestRating: number) {
    if (!(bestRating > 0)) return 0;
    let granted = 0;
    for (const rank of CF_RANK_BADGES) {
        if (bestRating >= rank.min && await grantAchievement(userId, rank.id)) granted++;
    }
    return granted;
}

/**
 * Awards the progress achievements a user has earned so far: first accepted
 * solution, solve streaks, coming back after a week away, study-log
 * discipline and the mentor role. Safe to call often; grants are idempotent.
 */
export async function checkProgressAchievements(userId: number, role?: string) {
    const [solved, streak, comeback, discipline] = await Promise.all([
        query(
            `SELECT EXISTS (SELECT 1 FROM user_progress WHERE user_id = $1 AND status = 'SOLVED')
                 OR EXISTS (SELECT 1 FROM submissions WHERE user_id = $1 AND verdict = 'Accepted') AS ok`,
            [userId]
        ),
        query('SELECT COALESCE(MAX(max_streak), 0) AS best FROM user_streaks WHERE user_id = $1', [userId]),
        query(
            `SELECT EXISTS (
                 SELECT 1 FROM (
                     SELECT solve_date - LAG(solve_date) OVER (ORDER BY solve_date) AS gap
                     FROM daily_solves WHERE user_id = $1
                 ) d WHERE gap >= 7
             ) AS ok`,
            [userId]
        ),
        // Longest run of consecutive program days with something logged.
        query(
            `WITH days AS (
                 SELECT (week_number - 1) * 7 + day_number AS n
                 FROM user_discipline_logs
                 WHERE user_id = $1 AND NOT is_missed
                   AND (COALESCE(total_hours, 0) > 0 OR COALESCE(done_tasks, '') <> '')
             )
             SELECT COALESCE(MAX(len), 0) AS best
             FROM (SELECT COUNT(*) AS len FROM (SELECT n, n - ROW_NUMBER() OVER (ORDER BY n) AS grp FROM days) g GROUP BY grp) r`,
            [userId]
        ),
    ]);

    // A Level 0 topic sheet (A-G) is done when every problem in it is solved.
    const sheets = await query(
        `SELECT s.sheet_number
         FROM curriculum_sheets s
         JOIN curriculum_levels l ON l.id = s.level_id AND l.level_number = 0
         WHERE s.sheet_number BETWEEN 1 AND 7
           AND s.total_problems > 0
           AND (SELECT COUNT(DISTINCT up.problem_id) FROM user_progress up
                 WHERE up.user_id = $1 AND up.status = 'SOLVED' AND up.sheet_id = s.id::text) >= s.total_problems`,
        [userId]
    );

    // Season badges and Codeforces ranks.
    const [seasons, cf] = await Promise.all([
        query(
            `SELECT
                 EXISTS (SELECT 1 FROM season_enrollments WHERE user_id = $1 AND season_year = 2026) AS s2026,
                 EXISTS (SELECT 1 FROM users u JOIN level0_training_registrations r ON r.application_id = u.application_id
                          WHERE u.id = $1 AND r.season_year = 2027) AS s2027`,
            [userId]
        ),
        query(`SELECT codeforces_data FROM users WHERE id = $1`, [userId]),
    ]);

    // 80% of the Level 0 topic sheets (A-G; the General sheets do not count).
    const skills = await query(
        `SELECT
             (SELECT COALESCE(SUM(s.total_problems), 0) FROM curriculum_sheets s
                JOIN curriculum_levels l ON l.id = s.level_id AND l.level_number = 0
               WHERE s.sheet_number BETWEEN 1 AND 7) AS total,
             (SELECT COUNT(DISTINCT up.sheet_id || ':' || up.problem_id) FROM user_progress up
                JOIN curriculum_sheets s2 ON s2.id::text = up.sheet_id
                JOIN curriculum_levels l2 ON l2.id = s2.level_id AND l2.level_number = 0
               WHERE up.user_id = $1 AND up.status = 'SOLVED' AND s2.sheet_number BETWEEN 1 AND 7) AS solved`,
        [userId]
    );

    const earned: string[] = [];
    const skillTotal = Number(skills.rows[0]?.total || 0);
    if (skillTotal > 0 && Number(skills.rows[0]?.solved || 0) >= Math.ceil(skillTotal * 0.8)) earned.push('level0-skills');
    if ((await ecpcTeamUserIds()).includes(Number(userId))) earned.push('ecpc-2026');
    if (seasons.rows[0]?.s2026) earned.push('year-2026');
    if (seasons.rows[0]?.s2027) earned.push('year-2027');
    const cfData = cf.rows[0]?.codeforces_data as { rating?: number | string; maxRating?: number | string } | null;
    const bestRating = Math.max(Number(cfData?.rating) || 0, Number(cfData?.maxRating) || 0);
    for (const rank of CF_RANK_BADGES) if (bestRating >= rank.min) earned.push(rank.id);
    for (const row of sheets.rows) earned.push(`sheet-${row.sheet_number}`);
    if (solved.rows[0]?.ok) earned.push('hello-world');
    const best = Number(streak.rows[0]?.best || 0);
    for (const n of STREAK_TIERS) if (best >= n) earned.push(`streak-${n}`);
    if (comeback.rows[0]?.ok) earned.push('comeback');
    const logRun = Number(discipline.rows[0]?.best || 0);
    if (logRun >= 7) earned.push('disciplined-7');
    if (logRun >= 56) earned.push('disciplined-program');
    if (role === 'mentor' || role === 'instructor' || role === 'owner') earned.push('mentor');

    let granted = 0;
    for (const id of earned) if (await grantAchievement(userId, id)) granted++;
    return granted;
}

/**
 * Grants an achievement based on a status change.
 * No longer updates the users table — achievements are the single source of truth.
 */
export async function updateUserStatus(userId: number | string, field: 'sheet_1_solved' | 'is_approval_unlocked', value: boolean) {
    if (!value) return;
    try {
        const achievementId = field === 'sheet_1_solved' ? ACHIEVEMENTS.SHEET_1 : ACHIEVEMENTS.APPROVAL;
        await grantAchievement(userId, achievementId);
    } catch (error) {
        console.error(`[Status Update Error] Failed to grant achievement for ${field} for user ${userId}:`, error);
    }
}

/**
 * Grants the Level 0 topic-sheet badge (sheets A-G are badges 1-7) when a sheet
 * has just been fully solved. The General sheets and other levels have none.
 */
export async function grantSheetBadge(userId: number | string, levelNumber: number, sheetNumber: number) {
    if (levelNumber !== 0 || sheetNumber < 1 || sheetNumber > 7) return false;
    return grantAchievement(userId, `sheet-${sheetNumber}`);
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
            const leaderboardResult = await client.query(`
                SELECT u.id
                FROM users u
                INNER JOIN user_solve_stats uss ON u.id = uss.user_id
                WHERE (u.is_shadow_banned = FALSE OR u.is_shadow_banned IS NULL)
                  AND (u.show_on_sheets_leaderboard = TRUE OR u.show_on_sheets_leaderboard IS NULL OR u.is_shadow_banned = TRUE)
                ORDER BY uss.distinct_solved DESC, uss.total_submissions ASC, uss.first_solve_at ASC
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
