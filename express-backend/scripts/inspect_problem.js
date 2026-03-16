import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

let dbUrl = process.env.DATABASE_URL;
if (dbUrl.includes('?')) dbUrl = dbUrl.split('?')[0];

const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function run() {
    await client.connect();
    const res = await client.query("SELECT * FROM curriculum_problems p JOIN curriculum_sheets s ON p.sheet_id = s.id JOIN curriculum_levels l ON s.level_id = l.id WHERE l.slug = 'level-1' LIMIT 1");
    console.log(JSON.stringify(res.rows[0], null, 2));
    await client.end();
}

run().catch(e => { console.error(e); process.exit(1); });
