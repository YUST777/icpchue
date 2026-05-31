const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Read DATABASE_URL from .env.production
const envContent = fs.readFileSync('/home/ubuntu/icpchue/next-app/.env.production', 'utf8');
const match = envContent.match(/^DATABASE_URL=(.+)$/m);
if (!match) { console.error('No DATABASE_URL found'); process.exit(1); }
let dbUrl = match[1].replace(/^["']|["']$/g, '');
if (dbUrl.includes('sslmode=require')) {
    dbUrl = dbUrl.replace('?sslmode=require', '').replace('&sslmode=require', '');
}

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const pool = new Pool({ connectionString: dbUrl, ssl: true });

async function main() {
    const result = await pool.query(`
        SELECT id, user_id, source, contest_id, problem_index, verdict,
               time_ms, memory_kb, language, paste_events, tab_switches,
               time_to_solve_seconds, attempt_number, cf_submission_id, cf_handle,
               submitted_at, source_code
        FROM submissions
        WHERE user_id = 139 AND source = 'codeforces'
        ORDER BY submitted_at ASC
    `);

    const columns = ['id','user_id','source','contest_id','problem_index','verdict','time_ms','memory_kb','language','paste_events','tab_switches','time_to_solve_seconds','attempt_number','cf_submission_id','cf_handle','submitted_at','source_code'];
    
    function escapeCsv(val) {
        if (val === null || val === undefined) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
            return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
    }

    let csv = columns.join(',') + '\n';
    for (const row of result.rows) {
        const line = columns.map(col => escapeCsv(row[col])).join(',');
        csv += line + '\n';
    }

    const outPath = '/home/ubuntu/icpchue/yasmin_submissions.csv';
    fs.writeFileSync(outPath, csv, 'utf8');
    console.log(`Written ${result.rows.length} rows to ${outPath}`);
    await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
