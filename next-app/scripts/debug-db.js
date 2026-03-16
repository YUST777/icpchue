const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function run() {
    try {
        await client.connect();
        console.log('Connected to DB');

        console.log('Querying Level 0 sheets...');
        const res = await client.query(`
            SELECT 
                l.slug as level_slug, 
                s.slug as sheet_slug, 
                s.id as sheet_id,
                s.name as sheet_name
            FROM curriculum_sheets s 
            JOIN curriculum_levels l ON s.level_id = l.id 
            WHERE l.level_number = 0
        `);

        console.log('Level 0 Sheets:', res.rows);

        console.log('Querying Level 1 sheets (for comparison)...');
        const res1 = await client.query(`
            SELECT 
                l.slug as level_slug, 
                s.slug as sheet_slug
            FROM curriculum_sheets s 
            JOIN curriculum_levels l ON s.level_id = l.id 
            WHERE l.level_number = 1
            LIMIT 3
        `);
        console.log('Level 1 Sheets (first 3):', res1.rows);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

run();
