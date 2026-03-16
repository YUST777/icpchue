/* eslint-disable @typescript-eslint/no-require-imports */
const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const fs = require('fs');

// Remove sslmode=require from URL so we can control it via config
const connectionString = process.env.DATABASE_URL.replace('?sslmode=require', '');

const client = new Client({
    connectionString,
    ssl: {
        rejectUnauthorized: false,
    }
});

async function run() {
    try {
        console.log('Connecting...');
        await client.connect();
        console.log('Connected!');

        // Check columns in users table
        const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND table_schema = 'public';
    `);

        console.log('Columns in users table:', res.rows.map(r => `${r.column_name} (${r.data_type})`).sort());
    } catch (err) {
        console.error('Connection error:', err);
    } finally {
        await client.end();
    }
}

run();
