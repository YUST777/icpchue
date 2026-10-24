const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Load .env from the current directory (next-app)
dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('❌ DATABASE_URL not found in .env');
    process.exit(1);
}

// Clean connection string for pg driver if needed, but Pool usually handles it
const pool = new Pool({
    connectionString: connectionString.replace('sslmode=require', 'sslmode=no-verify'),
    ssl: { rejectUnauthorized: false }
});

async function dropColumns() {
    try {
        console.log('🚀 Dropping obsolete columns from curriculum_problems...');
        await pool.query(`
            ALTER TABLE curriculum_problems 
            DROP COLUMN IF EXISTS difficulty, 
            DROP COLUMN IF EXISTS created_at, 
            DROP COLUMN IF EXISTS last_updated_at
        `);
        console.log('✅ Columns dropped successfully.');
    } catch (e) {
        console.error('❌ Error dropping columns:', e.message);
    } finally {
        await pool.end();
    }
}

dropColumns();
