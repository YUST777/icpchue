import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
import CryptoJS from 'crypto-js';

dotenv.config();

const encryptionKey = process.env.DB_ENCRYPTION_KEY;
let dbUrl = process.env.DATABASE_URL;
if (dbUrl.includes('?')) dbUrl = dbUrl.split('?')[0];

const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

const decrypt = (encryptedText) => {
    if (!encryptedText || !encryptionKey) return encryptedText;
    try {
        const bytes = CryptoJS.AES.decrypt(encryptedText, encryptionKey);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        return decrypted || encryptedText;
    } catch (error) {
        return encryptedText;
    }
};

async function run() {
    await client.connect();

    console.log('Fetching Detailed Activity for Top 3 Real Users...\n');

    // 1. Identify Top 3 Real Users
    const top3Res = await client.query(`
        WITH all_solves AS (
            SELECT user_id, sheet_id || '-' || problem_id AS problem_key
            FROM training_submissions
            WHERE verdict = 'Accepted'
            UNION ALL
            SELECT user_id, COALESCE(CAST(sheet_id AS TEXT), CAST(contest_id AS TEXT)) || '-' || problem_index AS problem_key
            FROM cf_submissions
            WHERE verdict = 'Accepted'
        ),
        user_stats AS (
            SELECT user_id, COUNT(DISTINCT problem_key) AS solved_count
            FROM all_solves
            GROUP BY user_id
        )
        SELECT u.id, a.name, u.email, u.codeforces_handle
        FROM users u
        INNER JOIN user_stats us ON u.id = us.user_id
        LEFT JOIN applications a ON u.application_id = a.id
        WHERE (u.is_shadow_banned = FALSE OR u.is_shadow_banned IS NULL)
          AND (u.show_on_sheets_leaderboard = TRUE OR u.show_on_sheets_leaderboard IS NULL)
        ORDER BY us.solved_count DESC, u.id ASC
        LIMIT 3
    `);

    for (const user of top3Res.rows) {
        console.log(`\n>>> Analyzing: ${user.name || user.email} (@${user.codeforces_handle || '?'})`);

        // Fetch all successful submissions for this user with per-day granularity
        const activityRes = await client.query(`
            SELECT 
                DATE(submitted_at AT TIME ZONE 'UTC') as activity_date,
                COUNT(DISTINCT problem_key) as solves_that_day,
                SUM(time_spent) as seconds_that_day
            FROM (
                SELECT 
                    submitted_at, 
                    sheet_id || '-' || problem_id AS problem_key, 
                    COALESCE(time_to_solve_seconds, 0) as time_spent
                FROM training_submissions
                WHERE user_id = $1 AND verdict = 'Accepted'
                
                UNION ALL
                
                SELECT 
                    submitted_at, 
                    COALESCE(CAST(sheet_id AS TEXT), CAST(contest_id AS TEXT)) || '-' || problem_index AS problem_key, 
                    0 as time_spent
                FROM cf_submissions
                WHERE user_id = $1 AND verdict = 'Accepted'
            ) combined
            GROUP BY activity_date
            ORDER BY activity_date ASC
        `, [user.id]);

        let totalSeconds = 0;
        let totalUniqueSolvesSet = new Set();
        let activeDaysCount = activityRes.rows.length;

        console.log(`   Detailed Activity Breakdown:`);
        activityRes.rows.forEach(row => {
            const dateStr = new Date(row.activity_date).toISOString().split('T')[0];
            const hours = Math.floor(row.seconds_that_day / 3600);
            const minutes = Math.floor((row.seconds_that_day % 3600) / 60);
            const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

            console.log(`     - ${dateStr}: ${row.solves_that_day} solve(s), ${timeStr} spent`);
            totalSeconds += parseInt(row.seconds_that_day);
        });

        // Summary Statistics
        const rangeRes = await client.query(`
            SELECT 
                MIN(submitted_at) as first_sub, 
                MAX(submitted_at) as last_sub,
                COUNT(id) as total_attempts
            FROM (
                SELECT id, submitted_at FROM training_submissions WHERE user_id = $1
                UNION ALL
                SELECT id, submitted_at FROM cf_submissions WHERE user_id = $1
            ) s
        `, [user.id]);

        const first = rangeRes.rows[0].first_sub;
        const last = rangeRes.rows[0].last_sub;
        const daysSpan = first && last ? Math.ceil((new Date(last) - new Date(first)) / (1000 * 60 * 60 * 24)) : 0;

        const totalHours = Math.floor(totalSeconds / 3600);
        const totalMinutes = Math.floor((totalSeconds % 3600) / 60);

        console.log(`\n   --- Summary for ${user.name || 'User'} ---`);
        console.log(`   Active Days: ${activeDaysCount} distinct days (Spread over ${daysSpan} total days)`);
        console.log(`   Total Time Recorded: ${totalHours}h ${totalMinutes}m`);
        console.log(`   Activity Span: ${first?.toISOString().split('T')[0]} to ${last?.toISOString().split('T')[0]}`);
    }

    await client.end();
}

run().catch(e => { console.error(e); process.exit(1); });
