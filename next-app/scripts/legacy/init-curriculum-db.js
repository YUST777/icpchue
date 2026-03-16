const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await client.connect();
        console.log('Connected to DB');

        // Check tables
        const tables = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('curriculum_levels', 'curriculum_sheets', 'curriculum_problems')
        `);
        console.log('Existing tables:', tables.rows.map(r => r.table_name));

        if (tables.rows.length < 3) {
            console.log('Missing curriculum tables. Please run the schema migration first.');
            // I should probably provide a script to create them if missing, 
            // but the user provided the schema, so I'll check if they are there first.
        } else {
            // Check if Level 0 exists
            const levelRes = await client.query("SELECT * FROM curriculum_levels WHERE level_number = 0");
            if (levelRes.rows.length === 0) {
                console.log('Initializing Level 0...');
                await client.query(`
                    INSERT INTO curriculum_levels (level_number, name, slug, description, duration_weeks)
                    VALUES (0, 'Level 0', 'level-0', 'Newcomers Training', 6)
                `);
            }

            const level0 = (await client.query("SELECT id FROM curriculum_levels WHERE level_number = 0")).rows[0];

            // Check if Sheet A exists
            const sheetRes = await client.query("SELECT * FROM curriculum_sheets WHERE slug = 'sheet-a' AND level_id = $1", [level0.id]);
            if (sheetRes.rows.length === 0) {
                console.log('Initializing Sheet A...');
                await client.query(`
                    INSERT INTO curriculum_sheets (level_id, sheet_letter, sheet_number, name, slug, description, contest_id)
                    VALUES ($1, 'A', 1, 'Data Types & Conditions', 'sheet-a', 'Sheet A: Data Types & Conditions', '219158')
                `, [level0.id]);
            }

            console.log('Basic levels/sheets initialized.');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

run();
