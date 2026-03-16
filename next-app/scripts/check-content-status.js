const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Database connection
let connectionString = process.env.DATABASE_URL;
if (connectionString.includes('sslmode=require')) {
    connectionString = connectionString.replace('?sslmode=require', '').replace('&sslmode=require', '');
}

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
});

async function checkContentStatus() {
    try {
        console.log('📊 Checking Curriculum Problem Content Status...');

        const totalRes = await pool.query(`SELECT COUNT(*) FROM curriculum_problems`);
        const total = parseInt(totalRes.rows[0].count);

        const filledRes = await pool.query(`SELECT COUNT(*) FROM curriculum_problems WHERE content IS NOT NULL`);
        const filled = parseInt(filledRes.rows[0].count);

        const percent = total > 0 ? (filled / total * 100).toFixed(1) : 0;

        console.log(`Total Problems in DB: ${total}`);
        console.log(`Problems with Content: ${filled} (${percent}%)`);

        // Check level distribution if possible, assuming sheets link them...
        // For now just general count.

        await pool.end();
    } catch (err) {
        console.error('❌ Database error:', err);
    }
}

checkContentStatus();
