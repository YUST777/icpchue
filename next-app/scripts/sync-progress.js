const { Pool } = require('pg');
const crypto = require('crypto');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from ../.env
dotenv.config({ path: path.join(__dirname, '../.env') });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Re-implement CF Client logic here to avoid import issues with TS/ESM/CommonJS mixing
function getSignedUrl(method, params, apiKey, apiSecret) {
    const time = Math.floor(Date.now() / 1000);
    const rand = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');

    // Default params
    const allParams = { ...params, apiKey, time };

    // Sort keys
    const keys = Object.keys(allParams).sort();
    const sortedParams = keys.map(key => `${key}=${allParams[key]}`).join('&');

    // Signature
    const signatureText = `${rand}/${method}?${sortedParams}#${apiSecret}`;
    const apiSig = crypto.createHash('sha512').update(signatureText).digest('hex');

    return `https://codeforces.com/api/${method}?${sortedParams}&apiSig=${rand}${apiSig}`;
}

async function fetchContestSubmissions(contestId) {
    const API_KEY = process.env.CF_API_KEY;
    const API_SECRET = process.env.CF_API_SECRET;

    if (!API_KEY || !API_SECRET) {
        console.error('Missing CF credentials');
        return [];
    }

    try {
        const url = getSignedUrl('contest.status', { contestId, from: 1, count: 500 }, API_KEY, API_SECRET);
        const res = await fetch(url);
        const data = await res.json();
        if (data.status === 'OK') return data.result;
        console.error(`CF Error (${contestId}):`, data.comment);
        return [];
    } catch (e) {
        console.error(`Fetch Error (${contestId}):`, e);
        return [];
    }
}

async function syncProgress() {
    const client = await pool.connect();
    try {
        console.log('--- Starting Progress Sync ---');

        // 1. Get all users with handles
        const usersRes = await client.query('SELECT id, codeforces_handle FROM users WHERE codeforces_handle IS NOT NULL');
        const usersMap = new Map(); // handle -> user_id
        usersRes.rows.forEach(u => usersMap.set(u.codeforces_handle.toLowerCase(), u.id));
        console.log(`Loaded ${usersMap.size} users.`);

        // 2. Get active sheets/contests (For now, let's just do Level 0/1 contests we know)
        // In reality, query curriculum_sheets
        const sheetsRes = await client.query('SELECT id, contest_id, level_id FROM curriculum_sheets WHERE contest_id IS NOT NULL');
        console.log(`Found ${sheetsRes.rows.length} sheets to sync.`);

        for (const sheet of sheetsRes.rows) {
            console.log(`Syncing Contest ${sheet.contest_id} (Sheet ${sheet.id})...`);

            const submissions = await fetchContestSubmissions(sheet.contest_id);
            if (!submissions || submissions.length === 0) continue;

            let addedCount = 0;
            for (const sub of submissions) {
                // Filter: Only OK verdict
                if (sub.verdict !== 'OK') continue;

                // Filter: Match user handle
                // Author members can be multiple (team), check if any match our users
                const authorHandles = sub.author.members.map(m => m.handle.toLowerCase());
                const matchedUserIds = authorHandles.map(h => usersMap.get(h)).filter(Boolean);

                if (matchedUserIds.length === 0) continue;

                // Problem ID: typically constructed as "${contestId}${index}" e.g. "219158A"
                // But our curriculum might map differently. For Level 0, problem letters match index. 
                const problemId = sub.problem.index; // 'A', 'B'...

                for (const userId of matchedUserIds) {
                    try {
                        await client.query(`
                            INSERT INTO user_progress (user_id, problem_id, sheet_id, submission_id, status, solved_at)
                            VALUES ($1, $2, $3, $4, 'SOLVED', to_timestamp($5))
                            ON CONFLICT (user_id, problem_id) DO NOTHING
                        `, [
                            userId,
                            problemId, // Storing 'A', 'B' as matched in sheet
                            sheet.id,
                            sub.id,
                            sub.creationTimeSeconds
                        ]);
                        addedCount++;
                    } catch (err) {
                        // Ignore unique constraint on submission_id or other minor errors
                    }
                }
            }
            console.log(`  > Processed. Added (or checked) ${addedCount} submissions.`);

            // Sleep to respect rate limit
            await new Promise(r => setTimeout(r, 500));
        }

    } catch (e) {
        console.error('Sync failed:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

syncProgress();
