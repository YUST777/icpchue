import { query } from './lib/db/db';

async function migrate() {
    try {
        console.log('Running migration: ADD COLUMN details TO cf_submissions');
        await query('ALTER TABLE cf_submissions ADD COLUMN IF NOT EXISTS details TEXT;');
        console.log('Migration successful.');
    } catch (err) {
        console.error('Migration failed:', err);
    }
}

migrate();
