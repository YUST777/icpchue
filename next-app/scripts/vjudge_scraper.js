/**
 * VJudge Problem Content Scraper (API-based, no browser needed)
 * 
 * Uses VJudge's internal API to fetch problem descriptions
 * and populates the curriculum_problems.content field.
 * 
 * Usage: node scripts/vjudge_scraper.js
 */

const path = require('path');
const { Pool } = require('pg');
const dotenv = require('dotenv');
const https = require('https');
const http = require('http');

// Try express-backend .env first, then next-app .env
dotenv.config({ path: path.join(__dirname, '../../express-backend/.env') });
if (!process.env.DATABASE_URL) {
    dotenv.config({ path: path.join(__dirname, '../.env') });
}
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

let connectionString = process.env.DATABASE_URL;
if (connectionString && connectionString.includes('sslmode=require')) {
    connectionString = connectionString.replace('?sslmode=require', '').replace('&sslmode=require', '');
}
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

const delay = ms => new Promise(r => setTimeout(r, ms));

// Simple fetch helper
function fetchURL(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        const req = client.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/json,*/*',
                'Accept-Language': 'en-US,en;q=0.9',
            }
        }, (res) => {
            // Follow redirects
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return fetchURL(res.headers.location).then(resolve).catch(reject);
            }
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, data, headers: res.headers }));
        });
        req.on('error', reject);
        req.setTimeout(30000, () => { req.destroy(); reject(new Error('Timeout')); });
    });
}

/**
 * Parse HTML content to extract problem structure
 */
function parseHTMLContent(html, title, origin) {
    // Remove script and style tags
    let cleanHTML = html.replace(/<script[\s\S]*?<\/script>/gi, '');
    cleanHTML = cleanHTML.replace(/<style[\s\S]*?<\/style>/gi, '');

    // Check if this is a PDF problem
    if (cleanHTML.includes('<embed') || cleanHTML.includes('.pdf') || cleanHTML.includes('application/pdf')) {
        return {
            type: 'external',
            meta: {
                title: title,
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
                <p>This problem is from <strong>${origin}</strong> and its statement is available as a PDF on the original judge.</p>
                <p>View the problem on <a href="https://vjudge.net/problem/${origin}" target="_blank" rel="noopener noreferrer">VJudge</a>.</p>
            </div>`,
            inputSpec: null,
            outputSpec: null,
            note: null,
            testCases: []
        };
    }

    // Extract time/memory limits
    const timeMatch = cleanHTML.match(/[Tt]ime\s*[Ll]imit[:\s]*(\d+\.?\d*)\s*(?:second|sec|s|ms)/i);
    const memMatch = cleanHTML.match(/[Mm]emory\s*[Ll]imit[:\s]*(\d+)\s*(?:MB|megabyte|M|kb)/i);

    let timeLimitMs = 2000;
    let memoryLimitMB = 256;
    if (timeMatch) {
        const val = parseFloat(timeMatch[1]);
        timeLimitMs = timeMatch[0].toLowerCase().includes('ms') ? val : val * 1000;
    }
    if (memMatch) {
        const val = parseInt(memMatch[1]);
        memoryLimitMB = memMatch[0].toLowerCase().includes('kb') ? Math.round(val / 1024) : val;
    }

    // Extract test cases from <pre> tags
    const testCases = [];

    // Pattern 1: Look for "Sample Input" / "Sample Output" sections
    const sampleInputRegex = /(?:sample\s*input|example\s*input|input\s*example|entrada)[^<]*(?:<\/[^>]+>)?\s*<pre[^>]*>([\s\S]*?)<\/pre>/gi;
    const sampleOutputRegex = /(?:sample\s*output|example\s*output|output\s*example|sa[ií]da)[^<]*(?:<\/[^>]+>)?\s*<pre[^>]*>([\s\S]*?)<\/pre>/gi;

    const inputs = [];
    const outputs = [];
    let m;
    while ((m = sampleInputRegex.exec(cleanHTML)) !== null) inputs.push(m[1].trim());
    while ((m = sampleOutputRegex.exec(cleanHTML)) !== null) outputs.push(m[1].trim());

    // Pattern 2: If no labeled samples, try consecutive pre blocks
    if (inputs.length === 0) {
        const preRegex = /<pre[^>]*>([\s\S]*?)<\/pre>/gi;
        const allPres = [];
        while ((m = preRegex.exec(cleanHTML)) !== null) {
            const text = m[1].trim();
            if (text.length > 0 && text.length < 5000) allPres.push(text);
        }
        // Pair them up
        for (let i = 0; i < allPres.length - 1; i += 2) {
            inputs.push(allPres[i]);
            outputs.push(allPres[i + 1]);
        }
    }

    for (let i = 0; i < Math.min(inputs.length, outputs.length); i++) {
        testCases.push({ id: i + 1, input: decodeHTMLEntities(inputs[i]), output: decodeHTMLEntities(outputs[i]) });
    }

    // Extract sections
    let storyHTML = cleanHTML;
    let inputSpec = null;
    let outputSpec = null;
    let note = null;

    // Try to split by Input/Output headers
    const inputHeaderIdx = cleanHTML.search(/<h[23][^>]*>\s*(?:Input|Entrada)\s*<\/h[23]>/i);
    const outputHeaderIdx = cleanHTML.search(/<h[23][^>]*>\s*(?:Output|Sa[ií]da)\s*<\/h[23]>/i);
    const sampleHeaderIdx = cleanHTML.search(/<h[23][^>]*>\s*(?:Sample|Example|Exemplo)/i);
    const noteHeaderIdx = cleanHTML.search(/<h[23][^>]*>\s*(?:Note|Constraint|Hint)/i);

    if (inputHeaderIdx > 0) {
        storyHTML = cleanHTML.substring(0, inputHeaderIdx);
        const endIdx = outputHeaderIdx > inputHeaderIdx ? outputHeaderIdx : (sampleHeaderIdx > inputHeaderIdx ? sampleHeaderIdx : cleanHTML.length);
        inputSpec = cleanHTML.substring(inputHeaderIdx, endIdx).replace(/<h[23][^>]*>[\s\S]*?<\/h[23]>/i, '').trim();
    }
    if (outputHeaderIdx > 0) {
        const endIdx = sampleHeaderIdx > outputHeaderIdx ? sampleHeaderIdx : (noteHeaderIdx > outputHeaderIdx ? noteHeaderIdx : cleanHTML.length);
        outputSpec = cleanHTML.substring(outputHeaderIdx, endIdx).replace(/<h[23][^>]*>[\s\S]*?<\/h[23]>/i, '').trim();
    }
    if (noteHeaderIdx > 0) {
        note = cleanHTML.substring(noteHeaderIdx).replace(/<h[23][^>]*>[\s\S]*?<\/h[23]>/i, '').trim();
    }

    return {
        type: 'problem',
        meta: {
            title: title,
            timeLimit: `${timeLimitMs / 1000} seconds`,
            memoryLimit: `${memoryLimitMB} megabytes`,
            timeLimitMs,
            memoryLimitMB,
            inputType: 'standard input',
            outputType: 'standard output',
            source: origin
        },
        story: storyHTML,
        inputSpec,
        outputSpec,
        note,
        testCases
    };
}

function decodeHTMLEntities(text) {
    return text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

/**
 * Try to fetch problem description from VJudge's description API
 */
async function fetchVJudgeProblemDescription(problemOJ) {
    // VJudge has an API at /problem/data/{OJ-ID} that returns JSON
    try {
        const url = `https://vjudge.net/problem/data?draw=1&start=0&length=1&OJId=All&probNum=&title=&source=&category=&_=${Date.now()}&search[value]=${encodeURIComponent(problemOJ)}`;
        // Try the simpler direct approach
        const directUrl = `https://vjudge.net/problem/${problemOJ}`;
        const res = await fetchURL(directUrl);

        if (res.status === 200 && res.data.length > 500) {
            // Look for the description ID in the page
            const descIdMatch = res.data.match(/descriptionId['":\s]+(\d+)/);
            if (descIdMatch) {
                const descId = descIdMatch[1];
                const descUrl = `https://vjudge.net/problem/description/${descId}`;
                const descRes = await fetchURL(descUrl);
                if (descRes.status === 200) {
                    return descRes.data;
                }
            }
        }
        return null;
    } catch (err) {
        return null;
    }
}

/**
 * Fetch all problem descriptions for a VJudge contest
 */
async function fetchContestDescriptions(contestId) {
    try {
        // Try the contest problem data endpoint
        const url = `https://vjudge.net/contest/${contestId}`;
        const res = await fetchURL(url);

        if (res.status !== 200) {
            console.log(`   ⚠️ Contest page returned ${res.status}`);
            return null;
        }

        // Extract problem descriptions from the HTML
        // The contest page embeds description data in the page JS
        const dataMatch = res.data.match(/contestProblems\s*=\s*(\[[\s\S]*?\]);/);
        if (dataMatch) {
            try {
                const problems = JSON.parse(dataMatch[1]);
                return problems;
            } catch (e) {
                // Fall through
            }
        }

        // Alternative: Look for problem data in script tags
        const scriptMatch = res.data.match(/<script[^>]*>([\s\S]*?)dataSource\s*=\s*(\{[\s\S]*?\});/);
        if (scriptMatch) {
            try {
                return JSON.parse(scriptMatch[2]);
            } catch (e) {
                // Fall through
            }
        }

        return res.data; // Return raw HTML for further parsing
    } catch (err) {
        console.error(`   ❌ Error fetching contest ${contestId}:`, err.message);
        return null;
    }
}

/**
 * Main function: Update empty Level 2 problems
 */
async function main() {
    console.log('🚀 VJudge Problem Content Scraper');
    console.log('==================================\n');

    // Get all Level 2 problems with empty content
    const res = await pool.query(`
        SELECT cp.id, cp.problem_letter, cp.title, cp.codeforces_url, cp.content,
               cs.sheet_letter, cs.name as sheet_name, cs.id as sheet_id
        FROM curriculum_problems cp
        JOIN curriculum_sheets cs ON cp.sheet_id = cs.id
        WHERE cs.level_id = 3
        ORDER BY cs.sheet_number, cp.problem_number
    `);

    console.log(`Found ${res.rows.length} total Level 2 problems\n`);

    let emptyCount = 0;
    let updateCount = 0;
    let failCount = 0;
    let pdfCount = 0;
    let skipCount = 0;

    for (const problem of res.rows) {
        const content = problem.content || {};
        const hasStory = content.story && content.story.trim().length > 10 && !content.story.includes('external-problem-notice');

        // Skip problems that already have real content
        if (hasStory && content.type !== 'external') {
            skipCount++;
            continue;
        }

        // Only process VJudge URLs
        if (!problem.codeforces_url || !problem.codeforces_url.includes('vjudge.net')) {
            // Try Codeforces URLs separately
            if (problem.codeforces_url && problem.codeforces_url.includes('codeforces.com')) {
                skipCount++;
                continue;
            }
            skipCount++;
            continue;
        }

        emptyCount++;
        const vjudgeId = problem.codeforces_url.replace('https://vjudge.net/problem/', '');
        console.log(`\n[${problem.sheet_letter}${problem.problem_letter}] ${problem.title} (${vjudgeId})`);

        try {
            // Try to fetch the problem description from VJudge
            const html = await fetchVJudgeProblemDescription(vjudgeId);

            if (html && html.length > 200) {
                // Parse the HTML content
                const parsedContent = parseHTMLContent(html, problem.title, vjudgeId);

                if (parsedContent.type === 'external') {
                    // PDF problem
                    await pool.query(
                        'UPDATE curriculum_problems SET content = $1 WHERE id = $2',
                        [JSON.stringify(parsedContent), problem.id]
                    );
                    console.log(`   📄 PDF problem - saved external link`);
                    pdfCount++;
                } else {
                    // Text problem
                    const storyLen = (parsedContent.story || '').length;
                    const tcCount = (parsedContent.testCases || []).length;

                    if (storyLen > 50) {
                        await pool.query(
                            'UPDATE curriculum_problems SET content = $1 WHERE id = $2',
                            [JSON.stringify(parsedContent), problem.id]
                        );
                        console.log(`   ✅ Updated (story: ${storyLen}chars, testCases: ${tcCount})`);
                        updateCount++;
                    } else {
                        // Content too short, might be an error
                        // Save as external link instead
                        parsedContent.type = 'external';
                        parsedContent.meta.isExternal = true;
                        parsedContent.story = `<div class="external-problem-notice">
                            <p>This problem is from <strong>${vjudgeId.split('-')[0]}</strong>.</p>
                            <p>View the full problem statement on <a href="${problem.codeforces_url}" target="_blank" rel="noopener noreferrer">VJudge</a>.</p>
                        </div>`;
                        await pool.query(
                            'UPDATE curriculum_problems SET content = $1 WHERE id = $2',
                            [JSON.stringify(parsedContent), problem.id]
                        );
                        console.log(`   ⚠️ Content too short (${storyLen}chars), saved as external`);
                        pdfCount++;
                    }
                }
            } else {
                // Could not fetch - save as external link
                const externalContent = {
                    type: 'external',
                    meta: {
                        title: problem.title,
                        timeLimit: '2 seconds',
                        memoryLimit: '256 megabytes',
                        timeLimitMs: 2000,
                        memoryLimitMB: 256,
                        inputType: 'standard input',
                        outputType: 'standard output',
                        source: vjudgeId.split('-')[0],
                        isExternal: true
                    },
                    story: `<div class="external-problem-notice">
                        <p>This problem is from <strong>${vjudgeId.split('-')[0]}</strong>.</p>
                        <p>View the full problem statement on <a href="${problem.codeforces_url}" target="_blank" rel="noopener noreferrer">VJudge</a>.</p>
                    </div>`,
                    inputSpec: null,
                    outputSpec: null,
                    note: null,
                    testCases: []
                };
                await pool.query(
                    'UPDATE curriculum_problems SET content = $1 WHERE id = $2',
                    [JSON.stringify(externalContent), problem.id]
                );
                console.log(`   ⚠️ Could not fetch, saved as external link`);
                failCount++;
            }
        } catch (err) {
            console.error(`   ❌ Error: ${err.message}`);
            failCount++;
        }

        // Rate limiting
        await delay(1500);
    }

    console.log(`\n\n📊 Summary:`);
    console.log(`   Total Level 2 problems: ${res.rows.length}`);
    console.log(`   Already had content: ${skipCount}`);
    console.log(`   Needed updating: ${emptyCount}`);
    console.log(`   Successfully scraped: ${updateCount}`);
    console.log(`   Saved as external (PDF/short): ${pdfCount}`);
    console.log(`   Failed: ${failCount}`);

    await pool.end();
    console.log('\n✨ Done!');
}

main().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
});
