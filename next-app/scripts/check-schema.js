const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

async function checkSchema() {
    console.log('--- curriculum_problems ---');
    const res = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'curriculum_problems'
    `);
    console.log(JSON.stringify(res.rows, null, 2));

    console.log('\n--- curriculum_sheets ---');
    const resSheets = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'curriculum_sheets'
    `);
    console.log(JSON.stringify(resSheets.rows, null, 2));

    console.log('\n--- curriculum_levels ---');
    const resLevels = await pool.query(`
        SELECT * FROM curriculum_levels
    `);
    console.log(JSON.stringify(resLevels.rows, null, 2));

    console.log('\n--- problem counts per level ---');
    const resCount = await pool.query(`
        SELECT l.level_number, COUNT(p.id) as problem_count
        FROM curriculum_levels l
        LEFT JOIN curriculum_sheets s ON l.id = s.level_id
        LEFT JOIN curriculum_problems p ON s.id = p.sheet_id
        GROUP BY l.level_number
        ORDER BY l.level_number
    `);
    console.log(JSON.stringify(resCount.rows, null, 2));
    process.exit(0);
}

checkSchema().catch(err => {
    console.error(err);
    process.exit(1);
});
