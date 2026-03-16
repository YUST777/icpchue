const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from ../.env
dotenv.config({ path: path.join(__dirname, '../.env') });

// Allow self-signed certs (needed for some Supabase/AWS setups depending on local env)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function verifyIntegrity() {
    console.log('--- Verifying Curriculum Integrity ---');
    console.log('Database URL:', process.env.DATABASE_URL ? 'Loaded' : 'Missing');

    const client = await pool.connect();
    try {
        // 1. Level Summary
        const levelsRes = await client.query(`
            SELECT 
                l.slug as level_slug, 
                l.name as level_name,
                COUNT(DISTINCT s.id) as sheet_count,
                COUNT(DISTINCT p.id) as problem_count
            FROM curriculum_levels l
            LEFT JOIN curriculum_sheets s ON s.level_id = l.id
            LEFT JOIN curriculum_problems p ON p.sheet_id = s.id
            GROUP BY l.id, l.slug, l.name
            ORDER BY l.slug;
        `);

        console.table(levelsRes.rows);

        // 2. Sheet Summary per Level
        console.log('\n--- Sheet Breakdowns ---');
        for (const row of levelsRes.rows) {
            console.log(`\n### Level: ${row.level_name} (${row.level_slug})`);
            const sheetsRes = await client.query(`
                SELECT 
                    s.slug as sheet_slug,
                    s.name as sheet_title,
                    COUNT(p.id) as problem_count
                FROM curriculum_sheets s
                JOIN curriculum_levels l ON s.level_id = l.id
                LEFT JOIN curriculum_problems p ON p.sheet_id = s.id
                WHERE l.slug = $1
                GROUP BY s.id, s.slug, s.name
                ORDER BY s.slug;
            `, [row.level_slug]);

            if (sheetsRes.rows.length > 0) {
                console.table(sheetsRes.rows);
            } else {
                console.log('No sheets found.');
            }
        }

        // 3. Corruption Checks
        console.log('\n--- Integrity Checks ---');

        // Check 1: Problems with no sheet
        const orphanedProblems = await client.query('SELECT COUNT(*) FROM curriculum_problems WHERE sheet_id IS NULL');
        const opCount = parseInt(orphanedProblems.rows[0].count);
        if (opCount > 0) {
            console.error(`❌ CRITICAL: ${opCount} orphaned problems found (no sheet_id).`);
        } else {
            console.log('✅ No orphaned problems.');
        }

        // Check 2: Sheets with no level
        const orphanedSheets = await client.query('SELECT COUNT(*) FROM curriculum_sheets WHERE level_id IS NULL');
        const osCount = parseInt(orphanedSheets.rows[0].count);
        if (osCount > 0) {
            console.error(`❌ CRITICAL: ${osCount} orphaned sheets found (no level_id).`);
        } else {
            console.log('✅ No orphaned sheets.');
        }

        // Check 3: Problems with missing essential data
        // Uses problem_letter and codeforces_url instead of slug
        const badProblems = await client.query(`
            SELECT COUNT(*) 
            FROM curriculum_problems 
            WHERE title IS NULL OR problem_letter IS NULL OR codeforces_url IS NULL
        `);
        const bpCount = parseInt(badProblems.rows[0].count);
        if (bpCount > 0) {
            console.error(`❌ CRITICAL: ${bpCount} problems with missing title, letter, or URL.`);
        } else {
            // Check 4: Verify Problem Counts
            const counts = {};
            levelsRes.rows.forEach(r => counts[r.level_slug] = parseInt(r.problem_count));

            // Level 0 Expectation: 249
            if (counts['level-0'] === 249) {
                console.log('✅ Level 0 count matches (249).');
            } else {
                console.warn(`⚠️ Level 0 count mismatch! Expected 249, found ${counts['level-0']}.`);
            }

            // Level 1 Expectation: ~156
            if (counts['level-1'] >= 150) {
                console.log(`✅ Level 1 count is healthy (${counts['level-1']}).`);
            } else {
                console.warn(`⚠️ Level 1 count low! Found ${counts['level-1']}.`);
            }

            // Level 2 Expectation: ~171
            if (counts['level-2'] >= 170) {
                console.log(`✅ Level 2 count is healthy (${counts['level-2']}).`);
            } else {
                console.warn(`⚠️ Level 2 count low! Found ${counts['level-2']}.`);
            }

        }
    } catch (e) {
        console.error('Verification failed:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

verifyIntegrity();
