import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

let dbUrl = process.env.DATABASE_URL;
if (dbUrl.includes('?')) dbUrl = dbUrl.split('?')[0];

const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function run() {
    await client.connect();

    // Get Level 2 sheets
    const level2 = await client.query("SELECT id FROM curriculum_levels WHERE slug = 'level2'");
    if (level2.rows.length === 0) { console.log('No level2'); return; }

    const sheets = await client.query('SELECT id, sheet_letter, name FROM curriculum_sheets WHERE level_id = $1 ORDER BY sheet_number', [level2.rows[0].id]);

    for (const sheet of sheets.rows) {
        const problems = await client.query('SELECT problem_letter, title, content, codeforces_url FROM curriculum_problems WHERE sheet_id = $1 ORDER BY problem_number LIMIT 3', [sheet.id]);

        console.log(`\n=== Sheet ${sheet.sheet_letter}: ${sheet.name} ===`);
        for (const p of problems.rows) {
            const content = p.content || {};
            const hasStory = !!(content.story && content.story.trim().length > 10);
            const hasTestCases = !!(content.testCases && content.testCases.length > 0);
            const hasMeta = !!(content.meta);
            const testCaseCount = content.testCases ? content.testCases.length : 0;

            console.log(`  ${p.problem_letter}: ${p.title}`);
            console.log(`    URL: ${p.codeforces_url}`);
            console.log(`    hasStory: ${hasStory}, hasMeta: ${hasMeta}, hasTestCases: ${hasTestCases} (${testCaseCount})`);
            if (hasStory) console.log(`    story preview: "${content.story.substring(0, 80)}..."`);
            if (hasTestCases) {
                console.log(`    sample TC: input="${content.testCases[0].input?.substring(0, 40)}", output="${content.testCases[0].output?.substring(0, 40)}"`);
            }
        }
    }

    await client.end();
}

run().catch(e => { console.error(e); process.exit(1); });
