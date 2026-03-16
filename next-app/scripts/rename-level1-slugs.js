const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Parse the connection string to remove sslmode if present, 
// so we can manually set the SSL config object.
const connectionString = process.env.DATABASE_URL.split('?')[0];

const pool = new Pool({
    connectionString: connectionString,
    ssl: {
        rejectUnauthorized: false,
    },
});

async function renameLevel1Slugs() {
    const client = await pool.connect();
    try {
        console.log('Connected to database...');

        // 1. Get Level 1 ID
        const levelRes = await client.query("SELECT id FROM curriculum_levels WHERE level_number = 1");
        if (levelRes.rows.length === 0) {
            console.error('Level 1 not found');
            return;
        }
        const level1Id = levelRes.rows[0].id;

        // 2. Get all sheets for Level 1 ordered by sheet_number
        const sheetsRes = await client.query(`
            SELECT id, sheet_number, name, slug 
            FROM curriculum_sheets 
            WHERE level_id = $1 
            ORDER BY sheet_number ASC
        `, [level1Id]);

        console.log(`Found ${sheetsRes.rows.length} sheets for Level 1.`);

        // 3. Update slugs to sheet-a, sheet-b, etc.
        for (const sheet of sheetsRes.rows) {
            const letter = String.fromCharCode(64 + sheet.sheet_number).toLowerCase(); // 1->a, 2->b...
            const newSlug = `sheet-${letter}`;

            console.log(`Renaming Sheet #${sheet.sheet_number} (${sheet.slug}) to ${newSlug}`);

            await client.query(`
                UPDATE curriculum_sheets 
                SET slug = $1 
                WHERE id = $2
            `, [newSlug, sheet.id]);
        }

        console.log('✅ Level 1 slugs updated successfully!');

    } catch (err) {
        console.error('Error updating slugs:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

renameLevel1Slugs();
