const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await client.connect();

        const tables = ['login_logs', 'user_achievements'];

        for (const table of tables) {
            console.log(`\n--- Schema for ${table} ---`);
            const res = await client.query(`
                SELECT indexname, indexdef 
                FROM pg_indexes 
                WHERE tablename = $1
            `, [table]);

            if (res.rows.length === 0) {
                console.log('No indexes found.');
            } else {
                res.rows.forEach(idx => {
                    console.log(`${idx.indexname}: ${idx.indexdef}`);
                });
            }
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

run();
