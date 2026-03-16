import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
import CryptoJS from 'crypto-js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

    console.log('Calculating Sheet Leaderboard (Judge0 + CF)...');

    // Replicate sheet leaderboard query
    const queryStr = `
        WITH all_solves AS (
            -- Judge0 solves
            SELECT user_id, sheet_id || '-' || problem_id AS problem_key, id AS sub_id, time_to_solve_seconds
            FROM training_submissions
            WHERE verdict = 'Accepted'
            
            UNION ALL
            
            -- Codeforces solves
            SELECT user_id, COALESCE(CAST(sheet_id AS TEXT), CAST(contest_id AS TEXT)) || '-' || problem_index AS problem_key, id AS sub_id, 0 as time_to_solve_seconds
            FROM cf_submissions
            WHERE verdict = 'Accepted'
        ),
        user_stats AS (
            SELECT 
                user_id,
                COUNT(DISTINCT problem_key) AS solved_count,
                COUNT(sub_id) AS total_submissions,
                SUM(time_to_solve_seconds) as total_time_spent
            FROM all_solves
            GROUP BY user_id
        )
        SELECT 
            u.id,
            u.email as user_email,
            a.name,
            us.solved_count,
            us.total_submissions,
            us.total_time_spent,
            a.national_id,
            a.telephone,
            a.address,
            a.email as app_email,
            a.faculty,
            a.student_id,
            u.codeforces_handle
        FROM users u
        INNER JOIN user_stats us ON u.id = us.user_id
        LEFT JOIN applications a ON u.application_id = a.id
        WHERE (u.is_shadow_banned = FALSE OR u.is_shadow_banned IS NULL)
          AND (u.show_on_sheets_leaderboard = TRUE OR u.show_on_sheets_leaderboard IS NULL)
        ORDER BY us.solved_count DESC, us.total_submissions DESC
        LIMIT 3
    `;

    const result = await client.query(queryStr);

    console.log(`\n=== TOP ${result.rows.length} SHEET LEADERBOARD USERS (DECRYPTED) ===\n`);

    result.rows.forEach((u, i) => {
        const hours = Math.floor((u.total_time_spent || 0) / 3600);
        const minutes = Math.floor(((u.total_time_spent || 0) % 3600) / 60);
        const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

        console.log(`${i + 1}. ${u.name || (u.user_email?.split('@')[0])} (@${u.codeforces_handle || '?'})`);
        console.log(`   Solved: ${u.solved_count} (Submissions: ${u.total_submissions})`);
        console.log(`   Time Spent: ${timeStr}`);
        console.log(`   Phone: ${decrypt(u.telephone)}`);
        console.log(`   National ID: ${decrypt(u.national_id)}`);
        console.log(`   Email: ${decrypt(u.app_email) || u.user_email}`);
        console.log(`   Faculty: ${u.faculty}`);
        console.log(`   Student ID: ${decrypt(u.student_id)}`);
        console.log(`   Address: ${decrypt(u.address)}`);
        console.log('-------------------------------------------\n');
    });

    await client.end();
}

run().catch(e => { console.error(e); process.exit(1); });
