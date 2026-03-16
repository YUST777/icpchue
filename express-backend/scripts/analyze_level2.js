import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

let dbUrl = process.env.DATABASE_URL;
if (dbUrl.includes('?')) dbUrl = dbUrl.split('?')[0];

const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function run() {
    await client.connect();

    // Get Level 2 id
    const level2Res = await client.query("SELECT id FROM curriculum_levels WHERE slug = 'level-2'");
    if (level2Res.rows.length === 0) {
        console.log('Error: Level 2 not found');
        process.exit(1);
    }
    const levelId = level2Res.rows[0].id;

    // Get all problems for Level 2
    const query = `
        SELECT p.id, p.title, p.content, p.codeforces_url, s.sheet_letter, p.problem_letter
        FROM curriculum_problems p
        JOIN curriculum_sheets s ON p.sheet_id = s.id
        WHERE s.level_id = $1
        ORDER BY s.sheet_number, p.problem_number
    `;
    const problems = await client.query(query, [levelId]);

    let stats = {
        total: problems.rows.length,
        emptyContent: 0,
        missingStory: 0,
        missingTestCases: 0,
        missingMeta: 0,
        corrupted: 0,
        valid: 0
    };

    let issues = [];

    for (const p of problems.rows) {
        const content = p.content || {};
        const hasStory = !!(content.story && content.story.trim().length > 20);
        const hasTestCases = !!(content.testCases && content.testCases.length > 0);
        const hasMeta = !!(content.meta);

        let isCorrupted = false;
        if (!p.content || Object.keys(p.content).length === 0) {
            stats.emptyContent++;
            isCorrupted = true;
        } else {
            if (!hasStory) stats.missingStory++;
            if (!hasTestCases) stats.missingTestCases++;
            if (!hasMeta) stats.missingMeta++;

            // "Corrupted" in this context: No story AND no test cases, or just very broken content
            if (!hasStory && !hasTestCases) {
                isCorrupted = true;
                stats.corrupted++;
            }
        }

        if (!isCorrupted && hasStory && hasTestCases) {
            stats.valid++;
        } else if (isCorrupted) {
            issues.push({
                loc: `${p.sheet_letter}${p.problem_letter}`,
                title: p.title,
                url: p.codeforces_url,
                reason: !p.content ? 'No content object' : (!hasStory && !hasTestCases ? 'Missing story and test cases' : 'Semi-broken')
            });
        }
    }

    console.log('\n=== LEVEL 2 PROBLEM ANALYSIS ===');
    console.log(`Total Problems: ${stats.total}`);
    console.log(`Valid (Story + TestCases): ${stats.valid}`);
    console.log(`Empty Content: ${stats.emptyContent}`);
    console.log(`Missing Story: ${stats.missingStory}`);
    console.log(`Missing Test Cases: ${stats.missingTestCases}`);
    console.log(`Missing Metadata: ${stats.missingMeta}`);
    console.log(`Corrupted (No story & No TC): ${stats.corrupted}`);

    if (issues.length > 0) {
        console.log('\n--- Problems with Issues ---');
        issues.forEach(iss => {
            console.log(`[${iss.loc}] ${iss.title} (${iss.url}) - ${iss.reason}`);
        });
    }

    await client.end();
}

run().catch(e => { console.error(e); process.exit(1); });
