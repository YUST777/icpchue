/* eslint-disable @typescript-eslint/no-require-imports */
const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.production') });

const connectionString = process.env.DATABASE_URL.replace('?sslmode=require', '');

const client = new Client({
    connectionString,
    ssl: {
        rejectUnauthorized: false,
    }
});

async function run() {
    try {
        console.log('Connecting to', connectionString.split('@')[1]);
        await client.connect();
        console.log('Connected!');

        const res = await client.query(`
            SELECT id, email, codeforces_handle, created_at 
            FROM users 
            ORDER BY id DESC 
            LIMIT 10;
        `);

        console.log('Last updated users:');
        console.table(res.rows);
    } catch (err) {
        console.error('Connection error:', err);
    } finally {
        await client.end();
    }
}

run();
