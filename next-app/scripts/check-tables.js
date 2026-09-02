const pg = require('pg');
const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('DATABASE_URL is not set. Load it from a local, untracked environment file.');
    process.exit(1);
}

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
