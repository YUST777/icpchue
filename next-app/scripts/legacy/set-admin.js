/* eslint-disable @typescript-eslint/no-require-imports */
const { Client } = require('pg');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Load .env manually (avoid dotenv dependency)
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
        const m = line.match(/^([^#=]+)=(.*)$/);
        if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
    });
}

const blindIndexSalt = process.env.BLIND_INDEX_SALT || process.env.DB_ENCRYPTION_KEY || 'fallback-salt';

const createBlindIndex = (value) => {
    if (!value) return null;
    const normalized = value.toString().toLowerCase().trim();
    return crypto.createHmac('sha256', blindIndexSalt).update(normalized).digest('hex');
};

let connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    console.error('DATABASE_URL not set');
    process.exit(1);
}
if (connectionString.includes('sslmode=require')) {
    connectionString = connectionString.replace('?sslmode=require', '').replace('&sslmode=require', '');
}

const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function run() {
    try {
        await client.connect();
        const email = '8241043@horus.edu.eg';
        const emailBlindIndex = createBlindIndex(email);

        const res = await client.query(
            'UPDATE users SET role = $1 WHERE email_blind_index = $2 RETURNING id, role',
            ['owner', emailBlindIndex]
        );

        if (res.rowCount === 0) {
            console.log('No user found with that email. Trying by student_id from applications...');
            const appRes = await client.query(
                "SELECT email_blind_index FROM applications WHERE student_id = '8241043' LIMIT 1"
            );
            if (appRes.rows.length > 0) {
                const bi = appRes.rows[0].email_blind_index;
                const up = await client.query('UPDATE users u SET role = $1 FROM applications a WHERE u.application_id = a.id AND a.student_id = $2 RETURNING u.id, u.role', ['owner', '8241043']);
                if (up.rowCount > 0) {
                    console.log('Updated user (via application) to owner. User ID:', up.rows[0].id);
                } else {
                    console.log('Could not find linked user for student_id 8241043');
                }
            } else {
                console.log('User not found. Ensure the email or student_id exists.');
            }
        } else {
            console.log('Updated', res.rowCount, 'user(s) to owner. User ID:', res.rows[0].id);
        }
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
        process.exit(0);
    }
}
run();
