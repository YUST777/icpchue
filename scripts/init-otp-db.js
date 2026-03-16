import dotenv from 'dotenv';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars from server/.env because that's where DB config usually is
dotenv.config({ path: path.join(__dirname, 'server', '.env') });
// Fallback to next-app env if needed, but usually server/.env has the DATABASE_URL
if (!process.env.DATABASE_URL) {
    dotenv.config({ path: path.join(__dirname, 'next-app', '.env') });
}

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const createTableQuery = `
    CREATE TABLE IF NOT EXISTS email_verification_otps (
        email VARCHAR(255) PRIMARY KEY,
        otp_code VARCHAR(10) NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );
`;

async function run() {
    try {
        console.log('Connecting to DB...');
        await pool.query(createTableQuery);
        console.log('✅ OTP table created successfully.');
    } catch (err) {
        console.error('❌ Error creating table:', err);
    } finally {
        await pool.end();
    }
}

run();
