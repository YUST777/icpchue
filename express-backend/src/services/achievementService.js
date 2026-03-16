import { pool } from '../config/db.js';

export const ACHIEVEMENTS = {
    WELCOME: 'welcome',
    APPROVAL: 'approval',
    SHEET_1: 'sheet-1',
    RANK_500: '500pts',
    INSTRUCTOR: 'instructor'
};

/**
 * Grants an achievement to a user if they don't already have it.
 */
export async function grantAchievement(userId, achievementId) {
    try {
        const result = await pool.query(
            `INSERT INTO user_achievements (user_id, achievement_id, earned_at, seen)
             VALUES ($1, $2, NOW(), FALSE)
             ON CONFLICT (user_id, achievement_id) DO NOTHING
             RETURNING id`,
            [userId, achievementId]
        );

        if (result.rows.length > 0) {
            console.log(`[Achievement] User ${userId} earned: ${achievementId}`);
            return true;
        }
        return false;
    } catch (error) {
        console.error(`[Achievement Error] Failed to grant ${achievementId} to ${userId}:`, error);
        return false;
    }
}

/**
 * Check and grant rating-based achievements.
 */
export async function checkRatingAchievements(userId, rating) {
    if (!rating) return;
    const numRating = parseInt(rating);
    if (isNaN(numRating)) return;

    if (numRating >= 500) {
        await grantAchievement(userId, ACHIEVEMENTS.RANK_500);
    }
}
