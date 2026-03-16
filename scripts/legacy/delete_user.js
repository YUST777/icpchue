const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DB_URL
});

async function run() {
  try {
    const res = await pool.query("DELETE FROM auth.users WHERE email='8241043@horus.edu.eg'; DELETE FROM public.users WHERE email='8241043@horus.edu.eg';");
    console.log("Deleted from users successfully.");
  } catch(e) { console.error("Could not delete from users", e.message); }
  
  process.exit(0);
}
run();
