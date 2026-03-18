import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

let dbUrl = process.env.DATABASE_URL;
if (dbUrl.includes('?')) dbUrl = dbUrl.split('?')[0];

const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function run() {
    await client.connect();
    const res = await client.query("SELECT p.problem_letter, p.title FROM curriculum_problems p JOIN curriculum_sheets s ON p.sheet_id = s.id JOIN curriculum_levels l ON s.level_id = l.id WHERE l.slug = 'level-0' AND s.slug = 'sheet-a' ORDER BY p.problem_number");
    console.log(JSON.stringify(res.rows, null, 2));
    await client.end();
}

run().catch(e => { console.error(e); process.exit(1); });
