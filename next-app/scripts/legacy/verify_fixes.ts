
import { query } from './lib/db';
import { grantAchievement, ACHIEVEMENTS } from './lib/achievements';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.production' });

async function verify() {
    console.log('--- Verification Started ---');

    // 1. Verify Achievement Blocking
    const flaggedUserId = '35'; // Has cheating_flags: 2
    console.log(`Testing achievement grant for flagged user ${flaggedUserId}...`);
    
    // Attempt to grant a "test" achievement
    const testAchievement = 'test-block-' + Date.now();
    const wasGranted = await grantAchievement(flaggedUserId, testAchievement);
    
    if (!wasGranted) {
        console.log('✅ Success: Achievement blocked for flagged user.');
    } else {
        console.error('❌ Failure: Achievement was granted to flagged user!');
    }

    // 2. Verify Achievement for Clean User
    const cleanUserId = '38'; // Example top user
    console.log(`Testing achievement grant for clean user ${cleanUserId}...`);
    const cleanAchievement = 'test-pass-' + Date.now();
    const wasGrantedClean = await grantAchievement(cleanUserId, cleanAchievement);
    
    if (wasGrantedClean) {
        console.log('✅ Success: Achievement granted to clean user.');
    } else {
        console.error('❌ Failure: Achievement was NOT granted to clean user!');
    }

    // 3. Verify LeetCode Decryption in API logic
    // We can simulate the API call logic
    const leetcodeEncrypted = 'U2FsdGVkX198858gxZVe7J28kYPLTBe8U5m9788ER/g=';
    console.log('Simulating API decryption for LeetCode handle...');
    
    // Import decrypt from lib/encryption
    const { decrypt } = require('./lib/encryption');
    const decrypted = decrypt(leetcodeEncrypted);
    
    if (decrypted === 'ai-mahmoud') {
        console.log('✅ Success: LeetCode handle correctly decrypted.');
    } else {
        console.error('❌ Failure: LeetCode handle decryption failed! Result:', decrypted);
    }

    console.log('--- Verification Finished ---');
    process.exit(0);
}

verify();
