const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false }
});

async function setupNewsReactions() {
    const client = await pool.connect();
    try {
        console.log('Creating news_reactions table...');

        // Create table
        await client.query(`
            CREATE TABLE IF NOT EXISTS news_reactions (
                id SERIAL PRIMARY KEY,
                news_id VARCHAR(50) NOT NULL,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                reaction_type VARCHAR(20) NOT NULL CHECK (reaction_type IN ('like', 'heart', 'fire')),
                created_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(news_id, user_id, reaction_type)
            );
        `);
        console.log('✓ Table created');

        // Create indexes
        console.log('Creating indexes...');
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_news_reactions_news_id ON news_reactions(news_id);
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_news_reactions_user_id ON news_reactions(user_id);
        `);
        console.log('✓ Indexes created');

        // Enable RLS
        console.log('Enabling RLS...');
        await client.query(`
            ALTER TABLE news_reactions ENABLE ROW LEVEL SECURITY;
        `);
        console.log('✓ RLS enabled');

        // Drop existing policies if they exist
        await client.query(`DROP POLICY IF EXISTS "Allow authenticated read" ON news_reactions;`);
        await client.query(`DROP POLICY IF EXISTS "Allow users to insert own reactions" ON news_reactions;`);
        await client.query(`DROP POLICY IF EXISTS "Allow users to delete own reactions" ON news_reactions;`);

        // Create RLS policies
        console.log('Creating RLS policies...');

        // Allow authenticated users to read all reactions
        await client.query(`
            CREATE POLICY "Allow authenticated read" ON news_reactions
                FOR SELECT TO authenticated USING (true);
        `);

        // Allow users to insert their own reactions
        await client.query(`
            CREATE POLICY "Allow users to insert own reactions" ON news_reactions
                FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT id FROM users WHERE email = current_user));
        `);

        // Allow users to delete their own reactions
        await client.query(`
            CREATE POLICY "Allow users to delete own reactions" ON news_reactions
                FOR DELETE TO authenticated USING (user_id = (SELECT id FROM users WHERE email = current_user));
        `);

        console.log('✓ RLS policies created');
        console.log('\n✅ News reactions setup complete!');

    } catch (error) {
        console.error('❌ Error setting up news reactions:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

setupNewsReactions();
