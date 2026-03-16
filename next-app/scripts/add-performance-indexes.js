const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await client.connect();
        console.log('Connected to DB');

        const indexesStart = [
            // 1. Problems: Index on problem_letter (used for lookups like "A", "B")
            // ALREADY EXISTS: idx_curriculum_problems_letter

            // 2. Submissions: Composite index for User + Sheet + Problem (very common lookup)
            {
                name: 'idx_training_submissions_lookup',
                def: 'CREATE INDEX IF NOT EXISTS idx_training_submissions_lookup ON public.training_submissions (user_id, sheet_id, problem_id)'
            },

            // 3. Submissions: Composite index for User + Verdict (for "Solver" stats)
            // ALREADY EXISTS: idx_training_submissions_user_verdict

            // 4. Sheets: Index on slug (used for routing)
            // ALREADY EXISTS: idx_curriculum_sheets_slug

            // 5. Problems: Composite index for Sheet + Letter (unique constraint exists, but good to verify)
            // ALREADY EXISTS: curriculum_problems_sheet_id_problem_letter_key

            // 6. Users: Index on codeforces_handle
            {
                name: 'idx_users_codeforces_handle',
                def: 'CREATE INDEX IF NOT EXISTS idx_users_codeforces_handle ON public.users (codeforces_handle)'
            }
        ];

        console.log('Adding missing performance indexes...');

        for (const idx of indexesStart) {
            if (idx.name) {
                try {
                    console.log(`Creating ${idx.name}...`);
                    await client.query(idx.def);
                    console.log('Done.');
                } catch (e) {
                    console.log(`Error creating ${idx.name}:`, e.message);
                }
            }
        }

        console.log('Index migration complete.');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

run();
