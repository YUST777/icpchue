const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const dotenv = require('dotenv');
const axios = require('axios');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Database connection
let connectionString = process.env.DATABASE_URL;
if (connectionString && connectionString.includes('sslmode=require')) {
    connectionString = connectionString.replace('?sslmode=require', '').replace('&sslmode=require', '');
}

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
});

const MIRROR_SERVICE_URL = process.env.MIRROR_SERVICE_URL || 'http://localhost:3099';

/**
 * Fetch problem content using the mirror service
 */
async function fetchProblemContent(url) {
    try {
        console.log(`   Fetching content: ${url}`);
        const response = await axios.get(`${MIRROR_SERVICE_URL}/fetch?url=${encodeURIComponent(url)}`);

        if (response.data) {
            if (response.data.type === 'problem') return response.data;
            console.log(`   ⚠️ Received non-problem response: ${response.data.type || 'unknown'}`);
            return response.data;
        }
        return null;
    } catch (error) {
        console.error(`   ❌ Error fetching content for ${url}:`, error.message);
        if (error.response && error.response.data) {
            console.error(`      Detail: ${JSON.stringify(error.response.data)}`);
        }
        return null;
    }
}

/**
 * Main function
 */
async function preMirrorContent() {
    try {
        console.log('🚀 Starting Pre-Mirror Content Population...');

        // 1. Get problems with missing content
        // We select only those with missing content to allow resuming
        const res = await pool.query(`
            SELECT id, problem_letter, title, codeforces_url 
            FROM curriculum_problems 
            WHERE content IS NULL
            ORDER BY id ASC
        `);

        if (res.rows.length === 0) {
            console.log('✅ All problems already have content.');
            return;
        }

        console.log(`Found ${res.rows.length} problems with missing content.`);

        let successCount = 0;
        let failCount = 0;

        for (const problem of res.rows) {
            console.log(`\nProcessing Problem ${problem.id}: ${problem.title} (${problem.codeforces_url})...`);

            // Fetch content
            const content = await fetchProblemContent(problem.codeforces_url);

            if (content && content.type === 'problem') {
                // Update DB
                await pool.query(`
                    UPDATE curriculum_problems 
                    SET content = $1
                    WHERE id = $2
                `, [content, problem.id]);

                console.log(`   ✅ Content updated successfully.`);
                successCount++;
            } else {
                console.log(`   ⚠️ Failed to fetch valid content.`);
                failCount++;
            }

            // Optional delay to avoid rate limiting
            // await new Promise(r => setTimeout(r, 1000));
        }

        console.log(`\n✨ Pre-Mirror Completed!`);
        console.log(`   Success: ${successCount}`);
        console.log(`   Failed: ${failCount}`);

    } catch (err) {
        console.error('❌ database error:', err);
    } finally {
        await pool.end();
    }
}

// Run the script
if (require.main === module) {
    preMirrorContent();
}
