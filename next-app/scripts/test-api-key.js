const crypto = require('crypto');
require('dotenv').config();

const API_KEY = process.env.CF_API_KEY;
const API_SECRET = process.env.CF_API_SECRET;

async function cfApiCall(method, params = {}) {
    const time = Math.floor(Date.now() / 1000);
    const rand = Math.random().toString(36).substring(2, 8);
    params.apiKey = API_KEY;
    params.time = time;
    const sortedKeys = Object.keys(params).sort();
    const queryStr = sortedKeys.map(k => `${k}=${params[k]}`).join('&');
    const signatureBase = `${rand}/${method}?${queryStr}#${API_SECRET}`;
    const hash = crypto.createHash('sha512').update(signatureBase).digest('hex');
    const url = `https://codeforces.com/api/${method}?${queryStr}&apiSig=${rand}${hash}`;

    try {
        const res = await fetch(url);
        return await res.json();
    } catch (e) {
        return { status: 'FAILED', comment: e.message };
    }
}

async function run() {
    console.log("--- Codeforces Production Tracking Test ---");

    // 1. Check user info
    const info = await cfApiCall('user.info', { handles: 'BusinessDuck1' });
    if (info.status === 'OK') {
        console.log("✅ API Key belongs to:", info.result[0].handle);
    } else {
        console.log("❌ API Auth Failed:", info.comment);
        return;
    }

    // 2. Test possible groups (Assiut Level 0 and Level 1)
    const groups = ['MWSDmqGsZm', '3nQaj5GMG5'];
    for (const groupCode of groups) {
        console.log(`\nChecking Group: ${groupCode}...`);
        const listRes = await cfApiCall('contest.list', { groupCode });

        if (listRes.status === 'OK') {
            console.log(`✅ Success! Visible contests (${listRes.result.length}):`);
            listRes.result.slice(0, 3).forEach(c => console.log(`   - ${c.id}: ${c.name}`));

            // If they can see contests, try standings for the first one
            const contestId = listRes.result[0].id;
            const standings = await cfApiCall('contest.standings', { contestId, groupCode, from: 1, count: 5 });
            if (standings.status === 'OK') {
                const handles = standings.result.rows.map(r => r.party.members[0].handle);
                console.log(`   ✅ Standings discovery working! Found handles:`, handles.join(', '));
                console.log("   🔥 CENTRAL SYNC POSSIBLE FOR THIS GROUP.");
            } else {
                console.log("   ❌ Standings disabled for this key:", standings.comment);
            }
        } else {
            console.log(`   ❌ Access Denied: ${listRes.comment}`);
        }
    }
}

run();
