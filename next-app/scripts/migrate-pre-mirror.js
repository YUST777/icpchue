const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

let connectionString = process.env.DATABASE_URL;
if (connectionString.includes('sslmode=require')) {
    connectionString = connectionString.replace('?sslmode=require', '').replace('&sslmode=require', '');
}

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
});

async function migrate() {
    try {
        console.log('🔄 Starting migration for pre-mirroring...');

        // 1. Drop mirror tables
        console.log('🗑️  Dropping mirror_problems and mirror_views...');
        await pool.query('DROP TABLE IF EXISTS mirror_views');
        await pool.query('DROP TABLE IF EXISTS mirror_problems');

        // 2. Alter curriculum_problems
        console.log('mb  Adding content column to curriculum_problems...');

        // Check if column exists first
        const checkRes = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='curriculum_problems' AND column_name='content';
        `);

        if (checkRes.rows.length === 0) {
            await pool.query(`
                ALTER TABLE curriculum_problems 
                ADD COLUMN content JSONB,
                ADD COLUMN last_updated_at TIMESTAMP WITH TIME ZONE
            `);
            console.log('✅ Columns added successfully.');
        } else {
            console.log('ℹ️  Columns already exist.');
        }

    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        await pool.end();
    }
}

migrate();
