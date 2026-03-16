const { Pool } = require('pg');
let connectionString = process.env.DATABASE_URL;
if (connectionString.includes('sslmode=require')) {
    connectionString = connectionString.replace('?sslmode=require', '');
    connectionString = connectionString.replace('&sslmode=require', '');
}
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

async function run() {
  try {
    const res = await pool.query("SELECT email FROM users LIMIT 10");
    console.log("Existing emails (sample):", res.rows.map(r => r.email).join(', '));
    
    // Check with ILIKE
    const user = await pool.query("SELECT email FROM users WHERE email ILIKE $1", ['%8241043@horus.edu.eg%']);
    console.log("User in public.users (ILIKE):", user.rowCount);
    if(user.rowCount > 0) console.log("Exact email found:", user.rows[0].email);

  } catch (err) {
    console.error("ERROR:", err.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}
run();
