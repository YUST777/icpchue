/* eslint-disable @typescript-eslint/no-require-imports */
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

async function main() {
    try {
        const res = await pool.query(`
            SELECT table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name IN ('users', 'applications')
            ORDER BY table_name, column_name;
        `);

        console.log("Schema Columns:");
        res.rows.forEach(r => console.log(`${r.table_name}.${r.column_name} (${r.data_type})`));
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

main();
