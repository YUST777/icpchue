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
const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
});

const CURRICULUM_DIR = path.join(__dirname, '../../../scrape/icpchue-curriculum');
const MIRROR_SERVICE_URL = process.env.MIRROR_SERVICE_URL || 'http://localhost:3099';

// Mapping level numbers to their database IDs
const LEVEL_ID_MAP = {
    0: 1,
    1: 2,
    2: 3
};

/**
 * Parse markdown files to find sheet contests
 */
function getSheetContests() {
    const contests = [];
    const files = fs.readdirSync(CURRICULUM_DIR).filter(f => f.endsWith('-problems.md'));

    for (const file of files) {
        const content = fs.readFileSync(path.join(CURRICULUM_DIR, file), 'utf-8');

        // Extract Level
        const levelMatch = content.match(/# ICPCHUE Level (\d+):/);
        if (!levelMatch) continue;
        const levelNumber = parseInt(levelMatch[1]);

        console.log(`Scanning parsed file: ${file} (Level ${levelNumber})`);

        if (levelNumber === 0) {
            const sheetRegex = /## Sheet ([A-Z]): (.+?)\n[\s\S]*?\[Codeforces Contest (\d+)\]\((https:\/\/codeforces\.com\/group\/[^)]+)\)/g;
            let match;
            while ((match = sheetRegex.exec(content)) !== null) {
                const sheetLetter = match[1];
                contests.push({
                    levelNumber: levelNumber,
                    sheetLetter: sheetLetter,
                    sheetNumber: sheetLetter.charCodeAt(0) - 64, // A=1, B=2...
                    sheetName: match[2].trim(),
                    contestId: match[3],
                    contestUrl: match[4],
                    slug: `sheet-${sheetLetter.toLowerCase()}`
                });
            }
        } else if (levelNumber === 1) {
            // Level 1: Table format with Codeforces or VJudge links
            const tableRegex = /\|\s*([^|]+?)\s*\|\s*\[(?:Codeforces|VJudge)\]\((https:\/\/(?:codeforces\.com|vjudge\.net)\/[^)]+)\)\s*\|/g;
            let match;
            let charCode = 65; // 'A'
            let week = 1;
            while ((match = tableRegex.exec(content)) !== null) {
                const name = match[1].trim();
                const url = match[2].trim();
                let contestId = '000000';

                if (url.includes('codeforces.com')) {
                    contestId = url.match(/contest\/(\d+)/)?.[1] || '000000';
                } else if (url.includes('vjudge.net')) {
                    contestId = url.match(/contest\/(\d+)/)?.[1] || '000000';
                }

                contests.push({
                    levelNumber: levelNumber,
                    sheetLetter: String.fromCharCode(charCode++),
                    sheetNumber: week,
                    sheetName: name,
                    contestId,
                    contestUrl: url,
                    slug: `week-${week++}`
                });
            }
        } else if (levelNumber === 2) {
            const tableRegex = /\|\s*([^|]+?)\s*\|\s*\[VJudge\]\((https:\/\/vjudge\.net\/contest\/(\d+))\)\s*\|/g;
            let match;
            let charCode = 65; // 'A'
            let week = 1;
            while ((match = tableRegex.exec(content)) !== null) {
                const name = match[1].trim();
                const url = match[2].trim();
                const contestId = match[3];
                contests.push({
                    levelNumber: levelNumber,
                    sheetLetter: String.fromCharCode(charCode++),
                    sheetNumber: week,
                    sheetName: name,
                    contestId,
                    contestUrl: url,
                    slug: `week-${week++}`
                });
            }
        }
    }
    return contests;
}

/**
 * Fetch problems for a contest using the mirror service
 */
async function fetchContestProblems(contestUrl) {
    try {
        console.log(`   Fetching problems for URL: ${contestUrl}...`);
        const response = await axios.get(`${MIRROR_SERVICE_URL}/fetch?url=${encodeURIComponent(contestUrl)}`);

        if (response.data && response.data.problems) {
            return response.data.problems;
        }
        return [];
    } catch (error) {
        console.error(`   Error fetching URL ${contestUrl}:`, error.message);
        return [];
    }
}

async function expandCurriculum() {
    console.log('🚀 Starting Curriculum Expansion (Schema V3)...');
    const contests = getSheetContests();
    console.log(`Found ${contests.length} contest sheets across all levels.`);

    for (const sheetData of contests) {
        const levelId = LEVEL_ID_MAP[sheetData.levelNumber];
        if (!levelId) {
            console.error(`Unknown level number: ${sheetData.levelNumber}`);
            continue;
        }

        console.log(`\nProcessing Level ${sheetData.levelNumber} Sheet ${sheetData.sheetLetter}: ${sheetData.sheetName}`);

        // 1. Ensure the sheet exists
        let sheetId;
        try {
            const sheetRes = await pool.query(
                `INSERT INTO curriculum_sheets (level_id, sheet_letter, sheet_number, name, slug, contest_id, contest_url)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 ON CONFLICT (level_id, sheet_letter) 
                 DO UPDATE SET name = EXCLUDED.name, contest_id = EXCLUDED.contest_id, contest_url = EXCLUDED.contest_url, slug = EXCLUDED.slug, sheet_number = EXCLUDED.sheet_number
                 RETURNING id`,
                [levelId, sheetData.sheetLetter, sheetData.sheetNumber, sheetData.sheetName, sheetData.slug, sheetData.contestId, sheetData.contestUrl]
            );
            sheetId = sheetRes.rows[0].id;
        } catch (err) {
            console.error(`   Failed to create/find sheet: ${err.message}`);
            continue;
        }

        // 2. Fetch problems
        const problems = await fetchContestProblems(sheetData.contestUrl);
        console.log(`   Found ${problems.length} problems.`);

        for (const [index, problem] of problems.entries()) {
            try {
                const codeforcesUrl = problem.originalUrl || problem.url;

                await pool.query(
                    `INSERT INTO curriculum_problems (sheet_id, problem_number, problem_letter, title, codeforces_url)
                     VALUES ($1, $2, $3, $4, $5)
                     ON CONFLICT (sheet_id, problem_letter) 
                     DO UPDATE SET problem_number = EXCLUDED.problem_number, title = EXCLUDED.title, codeforces_url = EXCLUDED.codeforces_url`,
                    [sheetId, problem.id, problem.letter, problem.name, problem.originalUrl || problem.url]
                );
            } catch (err) {
                console.error(`   Error inserting problem ${problem.id}: ${err.message}`);
            }
        }
    }

    // Update total problem counts for levels
    console.log('\n📊 Updating Level problem counts...');
    try {
        await pool.query(`
            UPDATE curriculum_levels l
            SET total_problems = (
                SELECT COUNT(p.id)
                FROM curriculum_problems p
                JOIN curriculum_sheets s ON p.sheet_id = s.id
                WHERE s.level_id = l.id
            )
        `);
    } catch (err) {
        console.error('   Error updating level counts:', err.message);
    }

    console.log('\n✅ Curriculum Expansion Complete!');
    process.exit(0);
}

expandCurriculum().catch(err => {
    console.error('Fatal Error:', err);
    process.exit(1);
});
