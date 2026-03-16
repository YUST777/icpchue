import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

let dbUrl = process.env.DATABASE_URL;
if (dbUrl.includes('?')) {
    dbUrl = dbUrl.split('?')[0];
}

const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    console.log('Connecting to:', dbUrl);
    try {
        await client.connect();
        console.log('Connected!');

        const res = await client.query(`
            SELECT table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public'
            ORDER BY table_name, ordinal_position;
        `);

        let currentTable = '';
        res.rows.forEach(row => {
            if (row.table_name !== currentTable) {
                currentTable = row.table_name;
                console.log(`\nTable: ${currentTable}`);
            }
            console.log(`  - ${row.column_name} (${row.data_type})`);
        });

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

run();
