const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const level1Data = {
    id: 'level1',
    levelNumber: 1,
    name: 'Level 1',
    description: 'Master STL, algorithms, and intermediate data structures. Build the skills needed for competitive contests.',
    slug: 'level-1',
    duration: 8,
    sheets: [
        {
            sheet_letter: 'A',
            sheet_number: 1,
            name: 'Sheet A', // Will serve as title in DB
            slug: 'sheet-a',
            description: 'Time Complexity & Vectors',
            contest_id: '372026',
            group_id: '3nQaj5GMG5',
            total_problems: 26
        },
        {
            sheet_letter: 'B',
            sheet_number: 2,
            name: 'Sheet B',
            slug: 'sheet-b',
            description: 'STL Containers',
            contest_id: '373244',
            group_id: '3nQaj5GMG5',
            total_problems: 26
        },
        {
            sheet_letter: 'C',
            sheet_number: 3,
            name: 'Sheet C',
            slug: 'sheet-c',
            description: 'STL & Sorting',
            contest_id: '374321',
            group_id: '3nQaj5GMG5',
            total_problems: 26
        },
        {
            sheet_letter: 'D',
            sheet_number: 4,
            name: 'Sheet D',
            slug: 'sheet-d',
            description: 'Binary Search & Two Pointers',
            contest_id: '376466',
            group_id: '3nQaj5GMG5',
            total_problems: 26
        },
        {
            sheet_letter: 'E',
            sheet_number: 5,
            name: 'Sheet E',
            slug: 'sheet-e',
            description: 'Bitmask',
            contest_id: '377898',
            group_id: '3nQaj5GMG5',
            total_problems: 26
        },
        {
            sheet_letter: 'F',
            sheet_number: 6,
            name: 'Sheet F',
            slug: 'sheet-f',
            description: 'Number Theory Basics',
            contest_id: '219158',
            group_id: '3nQaj5GMG5',
            total_problems: 26
        },
        {
            sheet_letter: 'G',
            sheet_number: 7,
            name: 'Sheet G',
            slug: 'sheet-g',
            description: 'Prefix Sum & Frequency Array',
            contest_id: '219158',
            group_id: '3nQaj5GMG5',
            total_problems: 26
        },
        {
            sheet_letter: 'H',
            sheet_number: 8,
            name: 'Sheet H',
            slug: 'sheet-h',
            description: 'Two Pointers & Sliding Window',
            contest_id: '219158',
            group_id: '3nQaj5GMG5',
            total_problems: 26
        }
    ]
};

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await client.connect();
        console.log('Connected to DB');

        // 1. Ensure Level 1 exists
        console.log('Checking Level 1...');
        const levelRes = await client.query('SELECT id FROM curriculum_levels WHERE level_number = $1', [level1Data.levelNumber]);

        let levelId;
        if (levelRes.rows.length === 0) {
            console.log('Creating Level 1...');
            const insertRes = await client.query(`
                INSERT INTO curriculum_levels (level_number, name, slug, description, duration_weeks)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id
            `, [level1Data.levelNumber, level1Data.name, level1Data.slug, level1Data.description, level1Data.duration]);
            levelId = insertRes.rows[0].id;
        } else {
            console.log('Level 1 exists.');
            levelId = levelRes.rows[0].id;
        }

        // 2. Seed Sheets
        console.log(`Seeding ${level1Data.sheets.length} sheets for Level 1...`);
        for (const sheet of level1Data.sheets) {
            // Check if sheet exists
            const sheetRes = await client.query('SELECT id FROM curriculum_sheets WHERE slug = $1 AND level_id = $2', [sheet.slug, levelId]);

            if (sheetRes.rows.length === 0) {
                await client.query(`
                    INSERT INTO curriculum_sheets (
                        level_id, 
                        sheet_letter, 
                        sheet_number, 
                        name, 
                        slug, 
                        description, 
                        contest_id, 
                        group_id,
                        total_problems
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                `, [
                    levelId,
                    sheet.sheet_letter,
                    sheet.sheet_number,
                    sheet.name,
                    sheet.slug,
                    sheet.description,
                    sheet.contest_id,
                    sheet.group_id,
                    sheet.total_problems
                ]);
                console.log(`Inserted ${sheet.name} (${sheet.slug})`);
            } else {
                // Update just in case
                await client.query(`
                    UPDATE curriculum_sheets 
                    SET 
                        group_id = $1,
                        contest_id = $2,
                        description = $3
                    WHERE id = $4
                `, [sheet.group_id, sheet.contest_id, sheet.description, sheetRes.rows[0].id]);
                console.log(`Updated ${sheet.name} (${sheet.slug})`);
            }
        }

        // 3. Update Level Total Problems & Description
        console.log('Updating Level 1 metadata...');
        const totalRes = await client.query('SELECT SUM(total_problems) as total FROM curriculum_sheets WHERE level_id = $1', [levelId]);
        const totalProblems = totalRes.rows[0].total || 0;

        await client.query(`
            UPDATE curriculum_levels 
            SET 
                total_problems = $1,
                description = $2,
                slug = $3,
                name = $4
            WHERE id = $5
        `, [
            totalProblems,
            level1Data.description,
            level1Data.slug,
            level1Data.name,
            levelId
        ]);
        console.log(`Updated Level 1: ${totalProblems} problems, description set.`);

        console.log('Level 1 seeding complete.');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

run();
