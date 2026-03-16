const ACCESS_TOKEN = process.env.CF_ACCESS_TOKEN || 'REPLACE_WITH_TOKEN'; // From DB

async function testEndpoint(name, url, options = {}) {
    console.log(`\nTesting ${name}...`);
    console.log(`URL: ${url}`);
    try {
        const res = await fetch(url, options);
        console.log(`Status: ${res.status}`);
        const data = await res.json();

        if (data.status === 'OK') {
            console.log(`✅ ${name} Success!`);
            if (Array.isArray(data.result)) {
                console.log(`   Result Items: ${data.result.length}`);
                if (data.result.length > 0) console.log(`   Sample: ${JSON.stringify(data.result[0]).substring(0, 100)}...`);
            } else {
                console.log(`   Result: ${JSON.stringify(data.result).substring(0, 100)}...`);
            }
        } else {
            console.log(`❌ ${name} Failed: ${data.comment}`);
        }
    } catch (e) {
        console.log(`❌ ${name} Error: ${e.message}`);
    }
}

async function run() {
    // 1. Test Authorized Method: user.friends (Requires Auth)
    // Try via Header
    await testEndpoint(
        'user.friends (Auth Header)',
        'https://codeforces.com/api/user.friends?onlyOnline=false',
        { headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` } }
    );

    // 2. Test Authorized Method: user.friends (Query Param)
    // This endpoint returns friends, which is private info.
    await testEndpoint(
        'user.friends (Query Param)',
        `https://codeforces.com/api/user.friends?onlyOnline=false&access_token=${ACCESS_TOKEN}`
    );
}

run();
