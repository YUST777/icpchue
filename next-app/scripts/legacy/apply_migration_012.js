const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.join(__dirname, '.env') });

const connectionString = process.env.DATABASE_URL.replace('?sslmode=require', '');

const client = new Client({
    connectionString,
    ssl: {
        rejectUnauthorized: false,
    }
});

async function run() {
    try {
        console.log('Connecting to database...');
        await client.connect();
        console.log('Connected!');

        const sqlPath = path.join(__dirname, 'migrations', '012_security_fixes.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Applying migration 012...');
        await client.query(sql);
        console.log('Migration 012 applied successfully!');
    } catch (err) {
        console.error('Error applying migration:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

run();
