import { Worker } from 'bullmq';
import { scrapeLeetCode, scrapeCodeforces } from './scraper.js';
import { pool } from '../config/db.js';
import { extractUsername } from '../utils/helpers.js';

const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD
};

export const initScraperWorker = () => {
    console.log('👷 Initializing Scraper Worker...');

    const worker = new Worker('scraper-queue', async (job) => {
        console.log(`🚀 Processing scrape job ${job.id} for App ID: ${job.data.applicationId}`);
        await processJob(job.data);
    }, {
        connection,
        concurrency: 1, // Process one at a time to be safe
        limiter: {
            max: 1,
            duration: 5000 // 1 job every 5 seconds (Conservative rate limit)
        }
    });

    worker.on('completed', (job) => {
        console.log(`✅ Job ${job.id} completed successfully`);
    });

    worker.on('failed', (job, err) => {
        console.error(`❌ Job ${job.id} failed: ${err.message}`);
    });

    worker.on('error', (err) => {
        console.error('Worker error:', err);
    });

    console.log('✅ Scraper Worker started with 5s rate limit');
};

const processJob = async (data) => {
    const { applicationId, leetcodeProfile, codeforcesProfile, applicationType } = data;

    // We now process both trainers and trainees to support global achievements
    if (!applicationId) return;

    let leetcodeData = null;
    let codeforcesData = null;
    let scrapingStatus = 'completed';

    try {
        if (leetcodeProfile) {
            const leetcodeUsername = extractUsername(leetcodeProfile, 'leetcode');
            if (leetcodeUsername) {
                console.log(`Job: Scraping LeetCode: ${leetcodeUsername}`);
                leetcodeData = await scrapeLeetCode(leetcodeUsername);
            }
        }

        if (codeforcesProfile) {
            const codeforcesUsername = extractUsername(codeforcesProfile, 'codeforces');
            if (codeforcesUsername) {
                console.log(`Job: Scraping Codeforces: ${codeforcesUsername}`);
                codeforcesData = await scrapeCodeforces(codeforcesUsername);
            }
        }

        const hasLeetcode = !!leetcodeData;
        const hasCodeforces = !!codeforcesData;
        const hasAnyProfile = !!leetcodeProfile || !!codeforcesProfile;

        if (hasAnyProfile) {
            // Success if we got data for at least one platform if both were requested? 
            // Or strict? Old logic: if (hasLeetcode || hasCodeforces) -> completed.
            if (hasLeetcode || hasCodeforces) {
                scrapingStatus = 'completed';
            } else {
                scrapingStatus = 'failed';
            }
        } else {
            // No profiles provided
            scrapingStatus = 'completed';
        }

        await updateScrapingResults(applicationId, leetcodeData, codeforcesData, scrapingStatus);

    } catch (err) {
        console.error(`Error processing job logic for ${applicationId}:`, err);
        await updateScrapingResults(applicationId, null, null, 'failed');
        throw err; // Re-throw to trigger BullMQ retry
    }
};

const updateScrapingResults = async (appId, leetcode, codeforces, status) => {
    try {
        const leetcodeJson = leetcode ? JSON.stringify(leetcode) : null;
        const codeforcesJson = codeforces ? JSON.stringify(codeforces) : null;

        // 1. Update applications table
        await pool.query(`
            UPDATE applications 
            SET leetcode_data = $1, codeforces_data = $2, scraping_status = $3
            WHERE id = $4
        `, [leetcodeJson, codeforcesJson, status, appId]);

        // 2. Sync to users table and check achievements if user exists
        const userRes = await pool.query("SELECT id FROM users WHERE application_id = $1", [appId]);
        if (userRes.rows.length > 0) {
            const userId = userRes.rows[0].id;

            // Update users table with latest data
            await pool.query(`
                UPDATE users 
                SET codeforces_data = $1
                WHERE id = $2
            `, [codeforcesJson, userId]);

            // Check for achievements
            if (codeforces?.rating) {
                const { checkRatingAchievements } = await import('./achievementService.js');
                await checkRatingAchievements(userId, codeforces.rating);
            }
        }
    } catch (err) {
        console.error(`DB Update failed for ${appId}:`, err);
        throw err;
    }
};
