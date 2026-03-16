import * as dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '.env.production' });

async function clearGhosts() {
    let connectionString = process.env.DATABASE_URL;
    if (connectionString?.includes('sslmode=require')) {
        connectionString = connectionString.replace('?sslmode=require', '');
        connectionString = connectionString.replace('&sslmode=require', '');
    }
    const pool = new pg.Pool({
        connectionString,
        ssl: { rejectUnauthorized: false } 
    });
    
    console.log("Locating all ghost applications...");
    const res = await pool.query(`
        SELECT a.id, a.email_blind_index
        FROM applications a
        LEFT JOIN users u ON a.id = u.application_id
        WHERE u.id IS NULL
    `);
    
    console.log(`Found ${res.rows.length} ghost records. Deleting them now...`);
    
    let deletedCount = 0;
    for (const record of res.rows) {
        if (record.email_blind_index) {
            await pool.query('DELETE FROM email_verifications WHERE email_blind_index = $1', [record.email_blind_index]);
        }
        await pool.query('DELETE FROM applications WHERE id = $1', [record.id]);
        deletedCount++;
    }
    
    console.log(`Successfully deleted ${deletedCount} ghost applications. All students are unblocked.`);
    process.exit(0);
}

clearGhosts().catch(console.error);
