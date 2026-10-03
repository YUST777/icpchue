// Summarize stored errors from public.app_error_logs.
// Usage: node --env-file=.env.local scripts/errors-report.mjs [hours=24] [limit=40]
//        npm run errors -- 168      (last 7 days)
import pg from 'pg';

const hours = Number(process.argv[2] || 24);
const limit = Number(process.argv[3] || 40);
const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL.replace(/[?&]sslmode=require/, ''),
    ssl: { rejectUnauthorized: false },
});

const grouped = await pool.query(
    `SELECT source, level, coalesce(path, '-') AS path,
            left(regexp_replace(message, '\\d{3,}', 'N', 'g'), 180) AS message,
            count(*)::int AS n, count(DISTINCT user_id)::int AS users,
            to_char(max(created_at) AT TIME ZONE 'Africa/Cairo', 'MM-DD HH24:MI') AS last_seen
       FROM public.app_error_logs
      WHERE created_at > now() - make_interval(hours => $1)
      GROUP BY 1, 2, 3, 4
      ORDER BY n DESC, last_seen DESC
      LIMIT $2`,
    [hours, limit]
);

console.log(`Errors in the last ${hours}h (Cairo time), most frequent first:\n`);
if (grouped.rows.length === 0) console.log('  none');
for (const r of grouped.rows) {
    console.log(`${String(r.n).padStart(5)}x  ${r.level.padEnd(5)} ${r.source.padEnd(7)} last ${r.last_seen}  users ${r.users}  ${r.path}`);
    console.log(`        ${r.message}`);
}
await pool.end();
