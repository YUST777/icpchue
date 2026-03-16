import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

let dbUrl = process.env.DATABASE_URL;
if (dbUrl.includes('?')) {
    dbUrl = dbUrl.split('?')[0];
}

const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
});

const ACHIEVEMENTS = {
    WELCOME: 'welcome',
    APPROVAL: 'approval',
    SHEET_1: 'sheet-1',
    RANK_500: '500pts',
    INSTRUCTOR: 'instructor'
};

async function run() {
    try {
        await client.connect();
        console.log('--- RETROACTIVE ACHIEVEMENT GRANTING ---');

        const users = await client.query('SELECT id, role, codeforces_data FROM users');

        for (const user of users.rows) {
            console.log(`Processing User ID: ${user.id}`);

            // 1. Welcome
            await client.query(`INSERT INTO user_achievements (user_id, achievement_id, earned_at, seen) VALUES ($1, $2, NOW(), TRUE) ON CONFLICT DO NOTHING`, [user.id, ACHIEVEMENTS.WELCOME]);

            // 2. Instructor
            if (user.role === 'instructor' || user.role === 'owner') {
                await client.query(`INSERT INTO user_achievements (user_id, achievement_id, earned_at, seen) VALUES ($1, $2, NOW(), TRUE) ON CONFLICT DO NOTHING`, [user.id, ACHIEVEMENTS.INSTRUCTOR]);
            }

            // 3. 500+ Pts
            let cfData = user.codeforces_data;
            if (cfData) {
                if (typeof cfData === 'string') cfData = JSON.parse(cfData);
                if (cfData.rating && parseInt(cfData.rating) >= 500) {
                    await client.query(`INSERT INTO user_achievements (user_id, achievement_id, earned_at, seen) VALUES ($1, $2, NOW(), TRUE) ON CONFLICT DO NOTHING`, [user.id, ACHIEVEMENTS.RANK_500]);
                }
            }

            // 4. Sheet 1 Solved
            const sheet1Progress = await client.query(`
                SELECT 
                    (SELECT total_problems FROM curriculum_sheets WHERE level_id = (SELECT id FROM curriculum_levels WHERE level_number = 1) AND sheet_number = 1) as total,
                    (SELECT COUNT(*) FROM user_progress WHERE user_id = $1 AND sheet_id = (SELECT id::text FROM curriculum_sheets WHERE level_id = (SELECT id FROM curriculum_levels WHERE level_number = 1) AND sheet_number = 1) AND status = 'SOLVED') as solved
            `, [user.id]);

            if (sheet1Progress.rows[0]?.total > 0 && sheet1Progress.rows[0].solved >= sheet1Progress.rows[0].total) {
                console.log(`User ${user.id} finished Sheet 1!`);
                await client.query(`UPDATE users SET sheet_1_solved = TRUE WHERE id = $1`, [user.id]);
                await client.query(`INSERT INTO user_achievements (user_id, achievement_id, earned_at, seen) VALUES ($1, $2, NOW(), TRUE) ON CONFLICT DO NOTHING`, [user.id, ACHIEVEMENTS.SHEET_1]);
            }

            // 5. Approval Camp
            const approvalProgress = await client.query(`
                SELECT COUNT(DISTINCT entity_id) as count
                FROM view_logs
                WHERE user_id = $1 AND entity_type = 'session' AND entity_id IN ('approvalcamp-1', 'approvalcamp-3', 'approvalcamp-4')
            `, [user.id]);

            if (parseInt(approvalProgress.rows[0].count) >= 3) {
                console.log(`User ${user.id} finished Approval Camp!`);
                await client.query(`UPDATE users SET is_approval_unlocked = TRUE WHERE id = $1`, [user.id]);
                await client.query(`INSERT INTO user_achievements (user_id, achievement_id, earned_at, seen) VALUES ($1, $2, NOW(), TRUE) ON CONFLICT DO NOTHING`, [user.id, ACHIEVEMENTS.APPROVAL]);
            }
        }

        console.log('✅ Retroactive granting completed.');

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await client.end();
    }
}

run();
