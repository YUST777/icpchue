const crypto = require('crypto');
const { Client } = require('pg');
require('dotenv').config();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // Handle self-signed certs

const API_KEY = process.env.CF_API_KEY;
const API_SECRET = process.env.CF_API_SECRET;
const DATABASE_URL = process.env.DATABASE_URL;

async function cfApiCall(method, params = {}) {
    const time = Math.floor(Date.now() / 1000);
    const rand = Math.random().toString(36).substring(2, 8);
    params.apiKey = API_KEY;
    params.time = time;
    const sortedKeys = Object.keys(params).sort();
    const queryStr = sortedKeys.map(k => `${k}=${params[k]}`).join('&');
    const signatureBase = `${rand}/${method}?${queryStr}#${API_SECRET}`;
    const hash = crypto.createHash('sha512').update(signatureBase).digest('hex');
    const apiSig = rand + hash;
    const url = `https://codeforces.com/api/${method}?${queryStr}&apiSig=${apiSig}`;

    try {
        const res = await fetch(url);
        return await res.json();
    } catch (e) {
        return { status: 'FAILED', comment: e.message };
    }
}

async function syncUser(client, user) {
    try {
        console.log(`[Sync] Starting ${user.codeforces_handle} (ID: ${user.id})...`);

        // Fetch user status (recent 50 submissions should be enough for typical delta)
        const res = await cfApiCall('user.status', { handle: user.codeforces_handle, from: 1, count: 50 });

        if (res.status !== 'OK') {
            console.error(`  ❌ Failed for ${user.codeforces_handle}:`, res.comment);
            return { handle: user.codeforces_handle, success: false, error: res.comment };
        }

        const submissions = res.result;
        let newSolved = 0;

        for (const sub of submissions) {
            if (!sub.contestId) continue;

            const problemId = `${sub.contestId}:${sub.problem.index}`;
            const status = sub.verdict === 'OK' ? 'SOLVED' : 'ATTEMPTED';

            await client.query(`
                INSERT INTO user_progress (user_id, problem_id, status, submission_id, solved_at)
                VALUES ($1, $2, $3, $4, to_timestamp($5))
                ON CONFLICT (user_id, problem_id) 
                DO UPDATE SET 
                    status = EXCLUDED.status,
                    submission_id = CASE WHEN EXCLUDED.status = 'SOLVED' THEN EXCLUDED.submission_id ELSE user_progress.submission_id END,
                    solved_at = CASE WHEN EXCLUDED.status = 'SOLVED' THEN EXCLUDED.solved_at ELSE user_progress.solved_at END
                WHERE user_progress.status != 'SOLVED' OR EXCLUDED.status = 'SOLVED';
            `, [user.id, problemId, status, sub.id, sub.creationTimeSeconds]);

            if (sub.verdict === 'OK') newSolved++;
        }

        console.log(`  ✅ Done ${user.codeforces_handle}: ${submissions.length} subs, ${newSolved} solved.`);
        return { handle: user.codeforces_handle, success: true, count: submissions.length, solved: newSolved };
    } catch (e) {
        console.error(`  💥 Exception for ${user.codeforces_handle}:`, e.message);
        return { handle: user.codeforces_handle, success: false, error: e.message };
    }
}

async function run() {
    console.log("🚀 Starting Production Sync Engine...");
    const startTime = Date.now();

    if (!API_KEY || !API_SECRET || !DATABASE_URL) {
        console.error("❌ Missing CF_API_KEY, CF_API_SECRET, or DATABASE_URL in .env");
        return;
    }

    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    await client.connect();

    try {
        // 1. Ensure Table & Index
        console.log("Checking database schema...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS user_progress (
                user_id UUID NOT NULL,
                problem_id TEXT NOT NULL,
                status TEXT NOT NULL,
                submission_id BIGINT,
                solved_at TIMESTAMP,
                PRIMARY KEY (user_id, problem_id)
            );
        `);

        // 2. Get all users
        const usersRes = await client.query(`
            SELECT id, codeforces_handle FROM users WHERE codeforces_handle IS NOT NULL
        `);

        const users = usersRes.rows;
        console.log(`Found ${users.length} users with linked handles.`);

        const results = [];
        const BATCH_SIZE = 3; // Stay safe within 5req/sec limit

        for (let i = 0; i < users.length; i += BATCH_SIZE) {
            const batch = users.slice(i, i + BATCH_SIZE);
            const batchResults = await Promise.all(batch.map(u => syncUser(client, u)));
            results.push(...batchResults);

            if (i + BATCH_SIZE < users.length) {
                await new Promise(r => setTimeout(r, 1000)); // 1s delay between batches
            }
        }

        // 3. Summary Report
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        const totalSubs = results.reduce((acc, r) => acc + (r.count || 0), 0);
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);

        console.log("\n" + "=".repeat(40));
        console.log("🏁 SYNC COMPLETE");
        console.log(`⏱️ Duration: ${duration}s`);
        console.log(`👤 Users: ${successful} success, ${failed} failed`);
        console.log(`📝 Submissions Tracked: ${totalSubs}`);
        console.log("=".repeat(40));

    } catch (err) {
        console.error("❌ Fatal Sync Error:", err);
    } finally {
        await client.end();
    }
}

run();
