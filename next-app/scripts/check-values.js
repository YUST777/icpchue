/* eslint-disable @typescript-eslint/no-require-imports */
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

async function main() {
    try {
        console.log("Distinct Roles:");
        const roles = await pool.query('SELECT DISTINCT role FROM users');
        roles.rows.forEach(r => console.log(r.role));

        console.log("\nDistinct Student Levels:");
        const levels = await pool.query('SELECT DISTINCT student_level FROM applications');
        levels.rows.forEach(r => console.log(r.student_level));

        console.log("\nDistinct Status:");
        const status = await pool.query('SELECT DISTINCT scraping_status FROM applications');
        status.rows.forEach(r => console.log(r.scraping_status));

    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

main();
