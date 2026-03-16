import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

let dbUrl = process.env.DATABASE_URL;
if (dbUrl.includes('?')) dbUrl = dbUrl.split('?')[0];

const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function run() {
    await client.connect();
    const res = await client.query("SELECT name, national_id, telephone FROM applications LIMIT 5");
    console.log(JSON.stringify(res.rows, null, 2));
    await client.end();
}

run().catch(e => { console.error(e); process.exit(1); });
