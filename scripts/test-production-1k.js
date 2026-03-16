const TARGET_URL = 'https://icpchue.com/api/training-sheets';
const TOTAL_REQUESTS = 1000;
const BATCH_SIZE = 50;

function generateRandomIP() {
    return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

async function runTest() {
    console.log(`🚀 Starting 1k UNIQUE USER Stress Test on ${TARGET_URL}...`);

    let successCount = 0;
    let failureCount = 0;
    const start = Date.now();

    for (let i = 0; i < TOTAL_REQUESTS; i += BATCH_SIZE) {
        const batch = [];
        for (let j = 0; j < BATCH_SIZE && (i + j) < TOTAL_REQUESTS; j++) {
            const fakeIP = generateRandomIP();
            batch.push(
                fetch(TARGET_URL, {
                    headers: { 'X-Forwarded-For': fakeIP },
                    signal: AbortSignal.timeout(15000) // Slightly longer timeout for server load
                })
                    .then(res => {
                        if (res.ok) successCount++;
                        else failureCount++;
                    })
                    .catch((err) => {
                        failureCount++;
                    })
            );
        }
        await Promise.all(batch);
        console.log(`Progress: ${i + BATCH_SIZE}/${TOTAL_REQUESTS} (Current IP Spoofed)`);
    }

    const duration = (Date.now() - start) / 1000;
    console.log('\n' + '='.repeat(30));
    console.log('📊 RESULTS:');
    console.log(`Total Requests: ${TOTAL_REQUESTS}`);
    console.log(`Successes:      ${successCount}`);
    console.log(`Failures:       ${failureCount}`);
    console.log(`Duration:       ${duration.toFixed(2)}s`);
    console.log(`Throughput:     ${(TOTAL_REQUESTS / duration).toFixed(2)} req/s`);
    console.log('='.repeat(30));

    if (failureCount > 0) {
        if (successCount > 100) {
            console.log('⚠️ Server handled some traffic but struggled/crashed under 1k unique users.');
        } else {
            console.log('❌ Server seems to be blocking spoofed IPs or hit a global bottleneck.');
        }
    } else {
        console.log('✅ Server handled 1k UNIQUE concurrent users successfully!');
    }
}

runTest().catch(console.error);
