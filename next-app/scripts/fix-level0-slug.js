const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await client.connect();
        console.log('Connected to DB');

        console.log('Updating Level 0 slug from "level0" to "level-0"...');

        const res = await client.query(`
            UPDATE curriculum_levels 
            SET slug = 'level-0' 
            WHERE level_number = 0 AND slug = 'level0'
        `);

        if (res.rowCount > 0) {
            console.log(`Successfully updated ${res.rowCount} row(s).`);
        } else {
            console.log('No rows updated. Slug might already be correct or level 0 not found.');
        }

        // Verify
        const verify = await client.query(`
            SELECT slug FROM curriculum_levels WHERE level_number = 0
        `);
        console.log('Current Level 0 slug:', verify.rows[0]?.slug);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

run();
