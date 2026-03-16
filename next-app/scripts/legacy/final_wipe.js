const { Pool } = require('pg');
const crypto = require('crypto');

let connectionString = process.env.DATABASE_URL;
if (connectionString.includes('sslmode=require')) {
    connectionString = connectionString.replace('?sslmode=require', '');
    connectionString = connectionString.replace('&sslmode=require', '');
}

const salt = process.env.BLIND_INDEX_SALT;
const email = (process.env.TEST_EMAIL || '').trim().toLowerCase();
const blindIndex = crypto.createHmac('sha256', salt).update(email).digest('hex');

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    console.log("Blind Index for 8241043@horus.edu.eg:", blindIndex);
    
    // 1. Delete from public.users
    const resUsers = await pool.query("DELETE FROM users WHERE email_blind_index = $1", [blindIndex]);
    console.log("Deleted from public.users, rows:", resUsers.rowCount);
    
    // 2. Delete from public.applications
    const resApp = await pool.query("DELETE FROM applications WHERE email_blind_index = $1", [blindIndex]);
    console.log("Deleted from public.applications, rows:", resApp.rowCount);
    
    // 3. Delete from auth.users (Supabase uses plain text email or needs ID)
    // We try by email first in the auth schema
    try {
      const resAuth = await pool.query("DELETE FROM auth.users WHERE email = $1", [email]);
      console.log("Deleted from auth.users (by email), rows:", resAuth.rowCount);
    } catch (e) {
      console.log("Could not delete from auth.users directly by email (expected if not superuser)");
    }
    
    console.log("Wipe attempt finished.");
  } catch (err) {
    console.error("CRITICAL ERROR:", err.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}
run();
