const pg = require('pg');
const { Pool } = pg;

const connectionString = "postgresql://postgres.jokgfcglqqrzfitfnynu:J6cLzUxvmOCtug%40X0@aws-1-eu-west-1.pooler.supabase.com:5432/postgres";

async function main() {
    const pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log("Checking tables in database...");
        const res = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        console.log("Tables in DB:");
        res.rows.forEach(row => {
            console.log(`- ${row.table_name}`);
        });

    } catch (e) {
        console.error("Error checking tables:", e);
    } finally {
        await pool.end();
    }
}

main();
