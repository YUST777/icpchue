const { Client } = require('pg');
const { exec } = require('child_process');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const CONTEST_ID = '219158'; // Sheet A
const GROUP_ID = 'MWSDmqGsZm';
const PROBLEMS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function fetchProblem(letter) {
    const url = `https://codeforces.com/group/${GROUP_ID}/contest/${CONTEST_ID}/problem/${letter}`;
    return new Promise((resolve, reject) => {
        console.log(`Scraping Problem ${letter}...`);
        exec(`node mirror/cli_fetch.js ${url}`, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error fetching ${letter}:`, stderr);
                return resolve(null);
            }
            try {
                // stdout contains the JSON string
                const data = JSON.parse(stdout.trim());
                resolve(data);
            } catch (e) {
                console.error(`Failed to parse JSON for ${letter}:`, e);
                resolve(null);
            }
        });
    });
}

async function run() {
    try {
        await client.connect();

        const sheetRes = await client.query("SELECT id FROM curriculum_sheets WHERE slug = 'sheet-a'");
        if (sheetRes.rows.length === 0) {
            console.error('Sheet A not found in DB. Run init-curriculum-db.js first.');
            return;
        }
        const sheetId = sheetRes.rows[0].id;

        for (let i = 0; i < PROBLEMS.length; i++) {
            const letter = PROBLEMS[i];
            const data = await fetchProblem(letter);

            if (data && data.meta) {
                const title = data.meta.title.replace(/^[A-Z]\.\s+/, ''); // Remove "A. " prefix
                const url = `https://codeforces.com/group/${GROUP_ID}/contest/${CONTEST_ID}/problem/${letter}`;

                console.log(`Successfully fetched: ${title}`);

                await client.query(`
                    INSERT INTO curriculum_problems (sheet_id, problem_number, problem_letter, title, codeforces_url)
                    VALUES ($1, $2, $3, $4, $5)
                    ON CONFLICT (sheet_id, problem_letter) DO UPDATE 
                    SET title = EXCLUDED.title, codeforces_url = EXCLUDED.codeforces_url, updated_at = now()
                `, [sheetId, i + 1, letter, title, url]);
            } else {
                console.warn(`Skipping ${letter} due to fetch failure.`);
            }
        }

        console.log('Sheet A population complete!');

    } catch (err) {
        console.error('Run Error:', err);
    } finally {
        await client.end();
    }
}

run();
