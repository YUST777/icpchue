import { query } from './lib/db';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
    try {
        const migrationPath = path.join(process.cwd(), 'migrations/013_user_streaks.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');
        
        console.log('Applying migration 013...');
        
        // Postgres query() can't run multiple statements with parameters in some setups,
        // but raw SQL strings are usually fine if separated by semicolons in pg.
        await query(sql);
        
        console.log('Migration applied successfully!');
    } catch (e: any) {
        console.error('Migration failed:', e.message);
    }
}

main();
