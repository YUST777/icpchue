/**
 * Populate Recap 2025 Table
 * 
 * This script calculates and inserts recap data for all users into the recap_2025 table.
 * Run this script once to create a snapshot of 2025 performance data.
 * 
 * Usage: npx ts-node scripts/populate-recap-2025.ts
 */

import { query } from '../lib/db/db';
import problemsMetadata from '../data/problems-metadata.json';

// Create a lookup map for problem metadata
const problemMetadataMap = new Map(
    problemsMetadata.problems.map(p => [`sheet-1-${p.id}`, p])
);

interface RecapData {
    student_id: string;
    username: string;
    avatar_url: string | null;
    days_active: number;
    total_solved: number;
    total_submissions: number;
    top_problem: string;
    top_problem_attempts: number;
    rank_percentile: number;
    max_streak: number;
    preferred_language: string;
    top_tags: { tag: string; count: number }[];
    difficulty_solved: { easy: number; medium: number; hard: number };
    achievements: { id: string; title: string; image: string }[];
}

interface DbUser {
    id: string;
    created_at: string;
    email: string;
    student_id?: string;
    name?: string;
    avatar_url?: string;
}

async function calculateUserRecap(userId: string, user: DbUser): Promise<RecapData | null> {
    try {
        const displayName = user.name || user.email.split('@')[0];

        // Days Active
        const daysActive = user.created_at
            ? Math.ceil((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24))
            : 1;

        // Stats from training_submissions
        const statsRes = await query(`
            SELECT 
                COUNT(*) as total_submissions,
                COUNT(DISTINCT problem_id) FILTER (WHERE verdict = 'Accepted') as total_solved
            FROM training_submissions 
            WHERE user_id = $1
        `, [userId]);

        const { total_submissions, total_solved } = statsRes.rows[0];

        // Most Attempted Problem
        const popularRes = await query(`
            SELECT problem_id, COUNT(*) as attempts
            FROM training_submissions
            WHERE user_id = $1
            GROUP BY problem_id
            ORDER BY attempts DESC
            LIMIT 1
        `, [userId]);

        const topProblem = popularRes.rows[0]?.problem_id || 'N/A';
        const topProblemAttempts = popularRes.rows[0]?.attempts || 0;

        // Get all solved problems for tag calculation
        const solvedProblemsRes = await query(`
            SELECT DISTINCT problem_id, sheet_id
            FROM training_submissions
            WHERE user_id = $1 AND verdict = 'Accepted'
        `, [userId]);

        // Calculate top tags from solved problems
        const tagCounts: Record<string, number> = {};
        const difficultyCounts = { easy: 0, medium: 0, hard: 0 };

        for (const row of solvedProblemsRes.rows) {
            const key = `${row.sheet_id}-${row.problem_id}`;
            const meta = problemMetadataMap.get(key);
            if (meta) {
                for (const tag of meta.tags) {
                    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
                }
                if (meta.difficulty && meta.difficulty in difficultyCounts) {
                    difficultyCounts[meta.difficulty as keyof typeof difficultyCounts]++;
                }
            }
        }

        const topTags = Object.entries(tagCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([tag, count]) => ({ tag, count }));

        // Rank Calculation
        const rankRes = await query(`
            WITH UserCounts AS (
                SELECT user_id, COUNT(DISTINCT problem_id) FILTER (WHERE verdict = 'Accepted') as solved_count
                FROM training_submissions
                GROUP BY user_id
            )
            SELECT 
                (SELECT COUNT(*) FROM UserCounts WHERE solved_count > $1) as better_than,
                (SELECT COUNT(*) FROM UserCounts) as total_users
        `, [total_solved]);

        const betterThanCount = parseInt(rankRes.rows[0]?.better_than || '0');
        const totalUsers = parseInt(rankRes.rows[0]?.total_users || '1');
        const myRank = betterThanCount + 1;
        const percentile = Math.ceil((myRank / totalUsers) * 100);

        // Streak calculation
        const datesRes = await query(`
            SELECT DISTINCT DATE(submitted_at) as sub_date
            FROM training_submissions
            WHERE user_id = $1 AND verdict = 'Accepted'
            ORDER BY sub_date ASC
        `, [userId]);

        const dates = datesRes.rows.map((r: { sub_date: string }) => new Date(r.sub_date).getTime());
        let maxStreak = 0;
        let currentStreak = 0;
        let lastTime = 0;
        const ONE_DAY = 24 * 60 * 60 * 1000;

        for (const time of dates) {
            if (lastTime === 0) {
                currentStreak = 1;
            } else {
                const diff = time - lastTime;
                if (diff <= ONE_DAY + 3600000) {
                    currentStreak++;
                } else {
                    currentStreak = 1;
                }
            }
            if (currentStreak > maxStreak) maxStreak = currentStreak;
            lastTime = time;
        }

        // Calculate achievements (basic - everyone gets welcome)
        const achievements = [
            { id: 'welcome', title: 'Welcome', image: '/images/achievements/WELCOME.webp' }
        ];

        // Check if user solved all Sheet 1 problems (26 problems)
        if (parseInt(total_solved) >= 26) {
            achievements.push({ id: 'sheet1', title: 'Sheet 1 Champion', image: '/images/achievements/sheet1acheavment.webp' });
        }

        return {
            student_id: user.student_id || 'unknown',
            username: displayName,
            avatar_url: user.avatar_url || null,
            days_active: daysActive,
            total_solved: parseInt(total_solved || '0'),
            total_submissions: parseInt(total_submissions || '0'),
            top_problem: topProblem,
            top_problem_attempts: parseInt(topProblemAttempts),
            rank_percentile: percentile,
            max_streak: maxStreak || (dates.length > 0 ? 1 : 0),
            preferred_language: 'C++',
            top_tags: topTags,
            difficulty_solved: difficultyCounts,
            achievements
        };
    } catch (error) {
        console.error(`Error calculating recap for user ${userId}:`, error);
        return null;
    }
}

async function main() {
    console.log('🚀 Starting Recap 2025 population...\n');

    // Get all users with applications
    const usersRes = await query(`
        SELECT u.id, u.created_at, u.email, a.name, a.student_id, a.avatar_url
        FROM users u 
        JOIN applications a ON u.application_id = a.id 
        WHERE a.student_id IS NOT NULL
        ORDER BY u.created_at ASC
    `);

    console.log(`📊 Found ${usersRes.rows.length} users to process\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const user of usersRes.rows) {
        console.log(`Processing: ${user.name || user.email} (${user.student_id})`);

        const recap = await calculateUserRecap(user.id, user);

        if (recap) {
            try {
                // Insert or update recap data
                await query(`
                    INSERT INTO recap_2025 (
                        student_id, username, avatar_url,
                        days_active, total_solved, total_submissions,
                        top_problem, top_problem_attempts, rank_percentile,
                        max_streak, preferred_language,
                        top_tags, difficulty_solved, achievements,
                        updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
                    ON CONFLICT (student_id) DO UPDATE SET
                        username = EXCLUDED.username,
                        avatar_url = EXCLUDED.avatar_url,
                        days_active = EXCLUDED.days_active,
                        total_solved = EXCLUDED.total_solved,
                        total_submissions = EXCLUDED.total_submissions,
                        top_problem = EXCLUDED.top_problem,
                        top_problem_attempts = EXCLUDED.top_problem_attempts,
                        rank_percentile = EXCLUDED.rank_percentile,
                        max_streak = EXCLUDED.max_streak,
                        preferred_language = EXCLUDED.preferred_language,
                        top_tags = EXCLUDED.top_tags,
                        difficulty_solved = EXCLUDED.difficulty_solved,
                        achievements = EXCLUDED.achievements,
                        updated_at = NOW()
                `, [
                    recap.student_id,
                    recap.username,
                    recap.avatar_url,
                    recap.days_active,
                    recap.total_solved,
                    recap.total_submissions,
                    recap.top_problem,
                    recap.top_problem_attempts,
                    recap.rank_percentile,
                    recap.max_streak,
                    recap.preferred_language,
                    JSON.stringify(recap.top_tags),
                    JSON.stringify(recap.difficulty_solved),
                    JSON.stringify(recap.achievements)
                ]);

                console.log(`  ✅ Saved: ${recap.total_solved} solved, ${recap.max_streak} day streak`);
                successCount++;
            } catch (err) {
                console.error(`  ❌ Failed to save:`, err);
                errorCount++;
            }
        } else {
            console.log(`  ⚠️ Skipped (no data)`);
            errorCount++;
        }
    }

    console.log(`\n🎉 Done! ${successCount} success, ${errorCount} errors`);
    process.exit(0);
}

main().catch(console.error);
