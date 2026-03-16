/**
 * Curriculum Parser and Database Populator
 * 
 * This script parses the curriculum markdown files from /scrape/icpchue-curriculum/
 * and populates the curriculum_levels, curriculum_sheets, and curriculum_problems tables.
 * 
 * Usage: node scripts/populate-curriculum.js
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Database connection
let connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    console.error('DATABASE_URL is not set in .env');
    process.exit(1);
}

if (connectionString.includes('sslmode=require')) {
    connectionString = connectionString.replace('?sslmode=require', '').replace('&sslmode=require', '');
}

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
});

// Path to curriculum markdown files
const CURRICULUM_DIR = path.join(__dirname, '../../../scrape/icpchue-curriculum');

/**
 * Parse a curriculum markdown file
 * @param {string} filePath - Path to the markdown file
 * @returns {Object} Parsed curriculum data
 */
function parseCurriculumFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Extract level metadata from header
    const levelMatch = content.match(/# ICPCHUE Level (\d+): (.+)/);
    if (!levelMatch) {
        throw new Error(`Could not parse level from ${filePath}`);
    }

    const levelNumber = parseInt(levelMatch[1]);
    const levelName = levelMatch[2].split(' - ')[0].trim();

    // Extract duration and total problems
    const durationMatch = content.match(/\*\*Duration:\*\* (\d+) Weeks/);
    const totalProblemsMatch = content.match(/\*\*Total Problems:\*\* (\d+)/);

    const duration = durationMatch ? parseInt(durationMatch[1]) : null;
    const totalProblems = totalProblemsMatch ? parseInt(totalProblemsMatch[1]) : 0;

    // Parse sheets
    const sheets = [];
    const sheetRegex = /## Sheet ([A-Z]): (.+?)\n\*\*(\d+) Problems\*\* \| (.+?)\n\n📝 \*\*Full Sheet:\*\* \[Codeforces Contest (\d+)\]\((https:\/\/codeforces\.com\/group\/[^)]+)\)/g;

    let sheetMatch;
    while ((sheetMatch = sheetRegex.exec(content)) !== null) {
        const [, letter, name, problemCount, description, contestId, contestUrl] = sheetMatch;

        // Find the problems table for this sheet
        const sheetStartIndex = sheetMatch.index;
        const nextSheetMatch = content.indexOf('## Sheet', sheetStartIndex + 1);
        const sheetEndIndex = nextSheetMatch !== -1 ? nextSheetMatch : content.length;
        const sheetContent = content.substring(sheetStartIndex, sheetEndIndex);

        // Parse problems from the table
        const problems = [];
        const problemRegex = /\| (\d+) \| (.+?) \| \[Solve\]\((https:\/\/codeforces\.com\/group\/[^)]+\/problem\/([A-Z]))\) \|/g;

        let problemMatch;
        while ((problemMatch = problemRegex.exec(sheetContent)) !== null) {
            const [, number, title, url, problemLetter] = problemMatch;
            problems.push({
                number: parseInt(number),
                letter: problemLetter,
                title: title.trim(),
                url: url.trim()
            });
        }

        sheets.push({
            letter,
            name: name.trim(),
            description: description.trim(),
            contestId,
            contestUrl,
            totalProblems: parseInt(problemCount),
            problems
        });
    }

    return {
        levelNumber,
        levelName,
        duration,
        totalProblems,
        sheets
    };
}

/**
 * Populate the database with curriculum data
 */
async function populateCurriculum() {
    try {
        console.log('🚀 Starting curriculum population...\n');

        // Find all curriculum markdown files
        if (!fs.existsSync(CURRICULUM_DIR)) {
            throw new Error(`Curriculum directory not found: ${CURRICULUM_DIR}`);
        }

        const files = fs.readdirSync(CURRICULUM_DIR)
            .filter(f => f.endsWith('-problems.md'))
            .sort();

        console.log(`Found ${files.length} curriculum files:\n${files.map(f => `  - ${f}`).join('\n')}\n`);

        for (const file of files) {
            const filePath = path.join(CURRICULUM_DIR, file);
            console.log(`\n📖 Parsing ${file}...`);

            const curriculum = parseCurriculumFile(filePath);
            console.log(`   Level ${curriculum.levelNumber}: ${curriculum.levelName}`);
            console.log(`   Duration: ${curriculum.duration} weeks`);
            console.log(`   Total Problems: ${curriculum.totalProblems}`);
            console.log(`   Sheets: ${curriculum.sheets.length}`);

            // Insert or update level
            const levelSlug = `level${curriculum.levelNumber}`;
            const levelResult = await pool.query(`
                INSERT INTO curriculum_levels (level_number, name, slug, description, duration_weeks, total_problems)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (level_number) 
                DO UPDATE SET 
                    name = EXCLUDED.name,
                    slug = EXCLUDED.slug,
                    description = EXCLUDED.description,
                    duration_weeks = EXCLUDED.duration_weeks,
                    total_problems = EXCLUDED.total_problems,
                    updated_at = NOW()
                RETURNING id
            `, [
                curriculum.levelNumber,
                curriculum.levelName,
                levelSlug,
                `${curriculum.levelName} - ${curriculum.totalProblems} problems across ${curriculum.sheets.length} sheets`,
                curriculum.duration,
                curriculum.totalProblems
            ]);

            const levelId = levelResult.rows[0].id;
            console.log(`   ✅ Level inserted/updated (ID: ${levelId})`);

            // Insert sheets and problems
            for (let i = 0; i < curriculum.sheets.length; i++) {
                const sheet = curriculum.sheets[i];
                const sheetSlug = `sheet-${sheet.letter.toLowerCase()}`;

                console.log(`\n   📄 Sheet ${sheet.letter}: ${sheet.name} (${sheet.problems.length} problems)`);

                const sheetResult = await pool.query(`
                    INSERT INTO curriculum_sheets (
                        level_id, sheet_letter, sheet_number, name, slug, 
                        description, contest_id, contest_url, total_problems
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    ON CONFLICT (level_id, sheet_letter)
                    DO UPDATE SET
                        sheet_number = EXCLUDED.sheet_number,
                        name = EXCLUDED.name,
                        slug = EXCLUDED.slug,
                        description = EXCLUDED.description,
                        contest_id = EXCLUDED.contest_id,
                        contest_url = EXCLUDED.contest_url,
                        total_problems = EXCLUDED.total_problems,
                        updated_at = NOW()
                    RETURNING id
                `, [
                    levelId,
                    sheet.letter,
                    i + 1,
                    sheet.name,
                    sheetSlug,
                    sheet.description,
                    sheet.contestId,
                    sheet.contestUrl,
                    sheet.totalProblems
                ]);

                const sheetId = sheetResult.rows[0].id;

                // Insert problems
                for (const problem of sheet.problems) {
                    await pool.query(`
                        INSERT INTO curriculum_problems (
                            sheet_id, problem_number, problem_letter, title, codeforces_url
                        )
                        VALUES ($1, $2, $3, $4, $5)
                        ON CONFLICT (sheet_id, problem_letter)
                        DO UPDATE SET
                            problem_number = EXCLUDED.problem_number,
                            title = EXCLUDED.title,
                            codeforces_url = EXCLUDED.codeforces_url,
                            updated_at = NOW()
                    `, [
                        sheetId,
                        problem.number,
                        problem.letter,
                        problem.title,
                        problem.url
                    ]);
                }

                console.log(`      ✅ Sheet ${sheet.letter} and ${sheet.problems.length} problems inserted/updated`);
            }
        }

        console.log('\n\n✨ Curriculum population completed successfully!\n');

        // Print summary
        const levelCount = await pool.query('SELECT COUNT(*) as count FROM curriculum_levels');
        const sheetCount = await pool.query('SELECT COUNT(*) as count FROM curriculum_sheets');
        const problemCount = await pool.query('SELECT COUNT(*) as count FROM curriculum_problems');

        console.log('📊 Summary:');
        console.log(`   Levels: ${levelCount.rows[0].count}`);
        console.log(`   Sheets: ${sheetCount.rows[0].count}`);
        console.log(`   Problems: ${problemCount.rows[0].count}`);
        console.log('');

    } catch (error) {
        console.error('❌ Error populating curriculum:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Run the script
if (require.main === module) {
    populateCurriculum()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = { parseCurriculumFile, populateCurriculum };
