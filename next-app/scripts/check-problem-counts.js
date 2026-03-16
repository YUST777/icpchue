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

async function checkTables() {
    try {
        const curriculum = await pool.query('SELECT count(*) FROM curriculum_problems');
        const mirror = await pool.query('SELECT count(*) FROM mirror_problems');

        console.log(`curriculum_problems count: ${curriculum.rows[0].count}`);
        console.log(`mirror_problems count: ${mirror.rows[0].count}`);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkTables();
