/**
 * VJudge Problem Content Scraper (Puppeteer-based)
 * 
 * Uses Puppeteer to navigate VJudge contest pages and extract
 * problem content from iframes for Level 2 curriculum problems.
 * 
 * Usage: node scrape.js
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

puppeteer.use(StealthPlugin());
dotenv.config({ path: path.join(__dirname, '../express-backend/.env') });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

let connectionString = process.env.DATABASE_URL;
if (connectionString && connectionString.includes('?')) {
    connectionString = connectionString.split('?')[0];
}
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

const delay = ms => new Promise(r => setTimeout(r, ms));

// VJudge contest IDs mapped to sheet letters
const VJUDGE_CONTESTS = [
    { contestId: '463558', sheetLetter: 'A', name: 'Graph DFS/BFS 1' },
    { contestId: '463559', sheetLetter: 'B', name: 'Graph DFS/BFS 2' },
    { contestId: '463562', sheetLetter: 'C', name: 'SSSP' },
    { contestId: '463563', sheetLetter: 'D', name: 'DSU' },
    { contestId: '463564', sheetLetter: 'E', name: 'MST' },
    { contestId: '463551', sheetLetter: 'F', name: 'DP Basics' },
    { contestId: '463553', sheetLetter: 'G', name: 'DP Advanced' },
    { contestId: '463556', sheetLetter: 'H', name: 'DP Bitmask' },
    { contestId: '463561', sheetLetter: 'I', name: 'SCC & Bridges' },
];

/**
 * Extract problem content from the currently displayed problem in a VJudge contest
 */
async function extractCurrentProblem(page) {
    try {
        // Wait for the description iframe to load
        await page.waitForSelector('#frame-description iframe, iframe[src*="problem/description"]', { timeout: 15000 });
        await delay(2000);

        // Get the iframe element and switch to it
        const iframeHandle = await page.$('#frame-description iframe') || await page.$('iframe[src*="problem/description"]');
        if (!iframeHandle) return null;

        const frame = await iframeHandle.contentFrame();
        if (!frame) return null;

        // Wait for content in the iframe
        try {
            await frame.waitForSelector('#problem-body, body', { timeout: 10000 });
        } catch (e) {
            // Try to get whatever's there
        }
        await delay(1000);

        // Extract content from the iframe
        const content = await frame.evaluate(() => {
            const body = document.querySelector('#problem-body') || document.body;
            if (!body || body.innerHTML.trim().length < 20) return null;

            const fullHTML = body.innerHTML;

            // Check if this is a PDF embeds
            const hasEmbed = !!document.querySelector('embed, object, iframe[src*=".pdf"]');
            const isPDF = hasEmbed || fullHTML.includes('application/pdf') ||
                (fullHTML.trim().length < 200 && fullHTML.includes('http'));

            if (isPDF) return { type: 'pdf', html: fullHTML };

            // Extract test cases from <pre> tags
            const testCases = [];
            const headers = Array.from(body.querySelectorAll('h2, h3, strong, b, p'));

            // Find sample inputs/outputs
            const sampleInputs = [];
            const sampleOutputs = [];

            for (let i = 0; i < headers.length; i++) {
                const text = headers[i].textContent.toLowerCase().trim();
                if (text.includes('sample input') || text.includes('example input') || text.match(/input\s*\d*/)) {
                    let next = headers[i].nextElementSibling;
                    while (next && next.tagName !== 'PRE' && next.tagName !== 'H2' && next.tagName !== 'H3') {
                        next = next.nextElementSibling;
                    }
                    if (next && next.tagName === 'PRE') sampleInputs.push(next.textContent.trim());
                }
                if (text.includes('sample output') || text.includes('example output') || text.match(/output\s*\d*/)) {
                    let next = headers[i].nextElementSibling;
                    while (next && next.tagName !== 'PRE' && next.tagName !== 'H2' && next.tagName !== 'H3') {
                        next = next.nextElementSibling;
                    }
                    if (next && next.tagName === 'PRE') sampleOutputs.push(next.textContent.trim());
                }
            }

            // If labeled approach didn't work, try pairing pre elements
            if (sampleInputs.length === 0) {
                const allPres = Array.from(body.querySelectorAll('pre'));
                for (let i = 0; i < allPres.length - 1; i += 2) {
                    sampleInputs.push(allPres[i].textContent.trim());
                    sampleOutputs.push(allPres[i + 1].textContent.trim());
                }
            }

            for (let i = 0; i < Math.min(sampleInputs.length, sampleOutputs.length); i++) {
                testCases.push({ id: i + 1, input: sampleInputs[i], output: sampleOutputs[i] });
            }

            // Split content by sections
            let storyHTML = fullHTML;
            let inputSpec = null;
            let outputSpec = null;

            const inputIdx = fullHTML.search(/<h[23][^>]*>\s*Input/i);
            const outputIdx = fullHTML.search(/<h[23][^>]*>\s*Output/i);
            const sampleIdx = fullHTML.search(/<h[23][^>]*>\s*(Sample|Example)/i);

            if (inputIdx > 0) {
                storyHTML = fullHTML.substring(0, inputIdx);
                const endIdx = outputIdx > inputIdx ? outputIdx : (sampleIdx > inputIdx ? sampleIdx : fullHTML.length);
                inputSpec = fullHTML.substring(inputIdx, endIdx).replace(/<h[23][^>]*>[\s\S]*?<\/h[23]>/i, '').trim();
            }
            if (outputIdx > 0) {
                const endIdx = sampleIdx > outputIdx ? sampleIdx : fullHTML.length;
                outputSpec = fullHTML.substring(outputIdx, endIdx).replace(/<h[23][^>]*>[\s\S]*?<\/h[23]>/i, '').trim();
            }

            // Time/memory limits
            const bodyText = document.body.textContent || '';
            const timeMatch = bodyText.match(/time\s*(?:limit)?[:\s]*(\d+\.?\d*)\s*(?:second|sec|s)/i);
            const memMatch = bodyText.match(/memory\s*(?:limit)?[:\s]*(\d+)\s*(?:MB|megabyte)/i);

            return {
                type: 'text',
                storyHTML,
                inputSpec,
                outputSpec,
                testCases,
                fullHTML,
                timeLimitMs: timeMatch ? parseFloat(timeMatch[1]) * 1000 : 2000,
                memoryLimitMB: memMatch ? parseInt(memMatch[1]) : 256,
                htmlLength: fullHTML.length
            };
        });

        return content;
    } catch (err) {
        console.log(`      ⚠️ Iframe extraction error: ${err.message}`);
        return null;
    }
}

/**
 * Scrape a single VJudge contest
 */
async function scrapeContest(browser, contestInfo) {
    const { contestId, sheetLetter, name } = contestInfo;
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📋 Contest ${contestId} - Sheet ${sheetLetter}: ${name}`);
    console.log(`${'='.repeat(60)}`);

    // Get the sheet ID from DB
    const sheetRes = await pool.query(
        'SELECT id FROM curriculum_sheets WHERE level_id = 3 AND sheet_letter = $1',
        [sheetLetter]
    );
    if (sheetRes.rows.length === 0) {
        console.log(`   ⚠️ Sheet ${sheetLetter} not found in DB`);
        return;
    }
    const sheetId = sheetRes.rows[0].id;

    // Get problems that need content
    const problemsRes = await pool.query(
        `SELECT id, problem_letter, title, codeforces_url, content 
         FROM curriculum_problems WHERE sheet_id = $1 ORDER BY problem_number`,
        [sheetId]
    );

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    try {
        // Navigate to the contest
        console.log(`   🔗 Opening contest ${contestId}...`);
        await page.goto(`https://vjudge.net/contest/${contestId}`, {
            waitUntil: 'networkidle2',
            timeout: 45000
        });
        await delay(3000);

        let successCount = 0;
        let pdfCount = 0;
        let skipCount = 0;
        let failCount = 0;

        for (const problem of problemsRes.rows) {
            // Check if already has good content
            const c = problem.content || {};
            if (c.type === 'problem' && c.story && c.story.trim().length > 50) {
                console.log(`   ⏭️  ${problem.problem_letter}: ${problem.title} - already has content`);
                skipCount++;
                continue;
            }

            // Only process VJudge URLs
            if (!problem.codeforces_url || !problem.codeforces_url.includes('vjudge.net')) {
                skipCount++;
                continue;
            }

            console.log(`\n   🔍 ${problem.problem_letter}: ${problem.title}`);

            try {
                // Click the problem tab in the contest
                const clicked = await page.evaluate((letter) => {
                    // Try clicking the problem tab directly
                    const tabs = document.querySelectorAll('#prob-tab a, .nav-tabs a, .prob-tab a');
                    for (const tab of tabs) {
                        if (tab.textContent.trim() === letter) {
                            tab.click();
                            return true;
                        }
                    }
                    // Try using the anchor links
                    const links = document.querySelectorAll('a[href*="#problem"]');
                    for (const link of links) {
                        if (link.textContent.trim() === letter || link.textContent.includes(letter)) {
                            link.click();
                            return true;
                        }
                    }
                    // Try clicking table row
                    const rows = document.querySelectorAll('table tbody tr');
                    for (const row of rows) {
                        const cells = row.querySelectorAll('td');
                        if (cells.length > 1 && cells[1]?.textContent?.trim() === letter) {
                            const aLink = cells[3]?.querySelector('a') || row.querySelector('a');
                            if (aLink) { aLink.click(); return true; }
                        }
                    }
                    return false;
                }, problem.problem_letter);

                if (!clicked) {
                    console.log(`      ❌ Could not find tab for problem ${problem.problem_letter}`);
                    failCount++;
                    continue;
                }

                await delay(4000); // Wait for iframe to load

                // Extract content from the iframe
                const content = await extractCurrentProblem(page);

                if (!content) {
                    console.log(`      ❌ No content extracted`);
                    failCount++;
                    continue;
                }

                const origin = problem.codeforces_url.replace('https://vjudge.net/problem/', '');

                if (content.type === 'pdf') {
                    // PDF problem
                    const pdfContent = {
                        type: 'external',
                        meta: {
                            title: problem.title,
                            timeLimit: '2 seconds',
                            memoryLimit: '256 megabytes',
                            timeLimitMs: 2000,
                            memoryLimitMB: 256,
                            inputType: 'standard input',
                            outputType: 'standard output',
                            source: origin,
                            isExternal: true
                        },
                        story: `<div class="external-problem-notice">
                            <p>This problem is from <strong>${origin.split('-')[0]}</strong>.</p>
                            <p>View the full problem statement on <a href="${problem.codeforces_url}" target="_blank" rel="noopener noreferrer">VJudge</a>.</p>
                        </div>`,
                        inputSpec: null,
                        outputSpec: null,
                        note: null,
                        testCases: []
                    };
                    await pool.query('UPDATE curriculum_problems SET content = $1 WHERE id = $2',
                        [JSON.stringify(pdfContent), problem.id]);
                    console.log(`      📄 PDF problem`);
                    pdfCount++;
                } else {
                    // Text problem
                    const problemContent = {
                        type: 'problem',
                        meta: {
                            title: problem.title,
                            timeLimit: `${content.timeLimitMs / 1000} seconds`,
                            memoryLimit: `${content.memoryLimitMB} megabytes`,
                            timeLimitMs: content.timeLimitMs,
                            memoryLimitMB: content.memoryLimitMB,
                            inputType: 'standard input',
                            outputType: 'standard output',
                            source: origin
                        },
                        story: content.storyHTML || content.fullHTML,
                        inputSpec: content.inputSpec || null,
                        outputSpec: content.outputSpec || null,
                        note: null,
                        testCases: content.testCases || []
                    };
                    await pool.query('UPDATE curriculum_problems SET content = $1 WHERE id = $2',
                        [JSON.stringify(problemContent), problem.id]);
                    console.log(`      ✅ Saved (html: ${content.htmlLength || 0}chars, testCases: ${(content.testCases || []).length})`);
                    successCount++;
                }
            } catch (err) {
                console.log(`      ❌ Error: ${err.message}`);
                failCount++;
            }

            await delay(2500); // Rate limiting
        }

        console.log(`\n   📊 Sheet ${sheetLetter}: ${successCount} text, ${pdfCount} PDF, ${skipCount} skipped, ${failCount} failed`);

    } catch (err) {
        console.error(`   ❌ Contest error: ${err.message}`);
    } finally {
        await page.close();
    }
}

async function main() {
    console.log('🚀 VJudge Problem Content Scraper (Puppeteer)');
    console.log('============================================\n');

    const browser = await puppeteer.launch({
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
        ]
    });

    console.log('✅ Browser launched\n');

    try {
        for (const contest of VJUDGE_CONTESTS) {
            await scrapeContest(browser, contest);
            await delay(5000); // Delay between contests
        }
    } finally {
        await browser.close();
        await pool.end();
    }

    console.log('\n\n🎉 Scraping complete!');
}

main().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
});
