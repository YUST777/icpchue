const { Pool } = require('pg');
let connectionString = process.env.DATABASE_URL;
if (connectionString.includes('sslmode=require')) {
    connectionString = connectionString.replace('?sslmode=require', '');
    connectionString = connectionString.replace('&sslmode=require', '');
}
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

async function run() {
  try {
    const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'");
    console.log("Columns in users:", res.rows.map(r => r.column_name).join(', '));
    
    const res2 = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'applications'");
    console.log("Columns in applications:", res2.rows.map(r => r.column_name).join(', '));
  } catch (err) {
    console.error("ERROR:", err.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}
run();
