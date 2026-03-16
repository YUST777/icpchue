import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

let dbUrl = process.env.DATABASE_URL;
if (dbUrl.includes('?')) dbUrl = dbUrl.split('?')[0];

const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function run() {
    await client.connect();

    // Check levels
    const levels = await client.query('SELECT * FROM curriculum_levels ORDER BY level_number');
    console.log('--- LEVELS ---');
    levels.rows.forEach(l => console.log(`  Level ${l.level_number}: ${l.name} (slug: ${l.slug}, total_problems: ${l.total_problems})`));

    // Check Level 2 sheets
    const level2 = levels.rows.find(l => l.level_number === 2);
    if (level2) {
        const sheets = await client.query('SELECT * FROM curriculum_sheets WHERE level_id = $1 ORDER BY sheet_number', [level2.id]);
        console.log(`\n--- LEVEL 2 SHEETS (level_id: ${level2.id}) ---`);
        sheets.rows.forEach(s => console.log(`  Sheet ${s.sheet_letter} (#${s.sheet_number}): ${s.name} (contest_id: ${s.contest_id}, total_problems: ${s.total_problems})`));

        // Check problems per sheet
        for (const sheet of sheets.rows) {
            const problems = await client.query('SELECT * FROM curriculum_problems WHERE sheet_id = $1 ORDER BY problem_number', [sheet.id]);
            console.log(`\n  Sheet ${sheet.sheet_letter} problems (sheet_id: ${sheet.id}):`);
            if (problems.rows.length === 0) {
                console.log('    *** NO PROBLEMS ***');
            } else {
                problems.rows.forEach(p => {
                    const hasContent = p.content && Object.keys(p.content).length > 0;
                    console.log(`    ${p.problem_letter}: ${p.title} (content: ${hasContent ? 'YES' : 'EMPTY'}, url: ${p.codeforces_url || 'NONE'})`);
                });
            }
        }
    } else {
        console.log('\n*** LEVEL 2 DOES NOT EXIST IN DB ***');
    }

    await client.end();
}

run().catch(e => { console.error(e); process.exit(1); });
