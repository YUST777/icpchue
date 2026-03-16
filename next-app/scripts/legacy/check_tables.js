const { Pool } = require('pg');
let connectionString = process.env.DATABASE_URL;
if (connectionString.includes('sslmode=require')) {
    connectionString = connectionString.replace('?sslmode=require', '');
    connectionString = connectionString.replace('&sslmode=require', '');
}
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

async function run() {
  try {
    const res = await pool.query("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'");
    console.log("Tables in public:", res.rows.map(r => r.tablename).join(', '));
    
    // Check if user exists first
    const user = await pool.query("SELECT * FROM users WHERE email = $1", ['8241043@horus.edu.eg']);
    console.log("User in public.users:", user.rowCount);
    if(user.rowCount > 0) console.log("User ID:", user.rows[0].id);

    const app = await pool.query("SELECT * FROM applications WHERE email = $1", ['8241043@horus.edu.eg']);
    console.log("User in applications:", app.rowCount);

  } catch (err) {
    console.error("ERROR:", err.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}
run();
