const { Pool } = require('pg');

let connectionString = process.env.DATABASE_URL;

// Fix for Supabase SSL issues
if (connectionString.includes('sslmode=require')) {
    connectionString = connectionString.replace('?sslmode=require', '');
    connectionString = connectionString.replace('&sslmode=require', '');
}

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function run() {
  try {
    console.log("Connecting to database...");
    
    // Auth schema deletion
    // Note: auth.users might need schema qualification
    const resAuth = await pool.query("DELETE FROM auth.users WHERE email = $1", ['8241043@horus.edu.eg']);
    console.log("Deleted from auth.users, rows:", resAuth.rowCount);
    
    // Public schema deletion
    const resPublic = await pool.query("DELETE FROM users WHERE email = $1", ['8241043@horus.edu.eg']);
    console.log("Deleted from public.users, rows:", resPublic.rowCount);
    
    // Applications deletion
    const resApp = await pool.query("DELETE FROM applications WHERE email = $1", ['8241043@horus.edu.eg']);
    console.log("Deleted from applications, rows:", resApp.rowCount);
    
    console.log("SUCCESS: User wiped.");
  } catch (err) {
    console.error("ERROR during deletion:", err.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

run();
