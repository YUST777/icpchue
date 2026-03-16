import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

let u = process.env.DATABASE_URL;
if (u.includes('?')) u = u.split('?')[0];
const c = new Client({ connectionString: u, ssl: { rejectUnauthorized: false } });

await c.connect();

const sheets = await c.query('SELECT id, sheet_letter, name FROM curriculum_sheets WHERE level_id = 3 ORDER BY sheet_number');
for (const sheet of sheets.rows) {
    const problems = await c.query('SELECT problem_letter, title, content, codeforces_url FROM curriculum_problems WHERE sheet_id = $1 ORDER BY problem_number LIMIT 2', [sheet.id]);
    console.log('\n=== Sheet ' + sheet.sheet_letter + ': ' + sheet.name + ' ===');
    for (const p of problems.rows) {
        const content = p.content || {};
        const hasStory = !!(content.story && content.story.trim().length > 10);
        const hasTestCases = !!(content.testCases && content.testCases.length > 0);
        const tcCount = content.testCases ? content.testCases.length : 0;
        console.log('  ' + p.problem_letter + ': ' + p.title + ' url=' + p.codeforces_url);
        console.log('    hasStory=' + hasStory + ' hasTestCases=' + hasTestCases + '(' + tcCount + ')');
        if (hasStory) console.log('    story: ' + content.story.substring(0, 100) + '...');
        if (hasTestCases) console.log('    tc[0]: in=' + (content.testCases[0].input || '').substring(0, 50) + ' out=' + (content.testCases[0].output || '').substring(0, 50));
        if (!hasStory && !hasTestCases) console.log('    *** CONTENT EMPTY OR NO STATEMENT ***');
        console.log('    content keys: ' + JSON.stringify(Object.keys(content)));
    }
}
await c.end();
