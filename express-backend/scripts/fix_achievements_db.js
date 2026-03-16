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

async function run() {
    try {
        await client.connect();
        console.log('--- DB INITIALIZATION FIXES ---');

        // 1. Add missing columns to 'users' table if they don't exist
        console.log('Adding missing achievement columns to users table...');
        await client.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS sheet_1_solved BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS is_approval_unlocked BOOLEAN DEFAULT FALSE;
        `);

        // 2. Initialize "Welcome" achievement for existing users
        console.log('Checking for missing "Welcome" achievements...');
        const users = await client.query('SELECT id FROM users');
        for (const user of users.rows) {
            await client.query(`
                INSERT INTO user_achievements (user_id, achievement_id, earned_at, seen)
                VALUES ($1, 'welcome', NOW(), TRUE)
                ON CONFLICT DO NOTHING;
            `, [user.id]);
        }

        // Note: user_achievements doesn't have a unique constraint on (user_id, achievement_id) in my schema check.
        // Let's check for indexes or constraints.
        const constraints = await client.query(`
            SELECT conname FROM pg_constraint 
            WHERE conrelid = 'user_achievements'::regclass AND contype = 'u';
        `);

        if (constraints.rows.length === 0) {
            console.log('Adding UNIQUE constraint to user_achievements...');
            await client.query(`
                ALTER TABLE user_achievements 
                ADD CONSTRAINT unique_user_achievement UNIQUE (user_id, achievement_id);
            `);
        }

        console.log('✅ DB Fixes completed.');

    } catch (err) {
        console.error('❌ Error applying fixes:', err);
    } finally {
        await client.end();
    }
}

run();
