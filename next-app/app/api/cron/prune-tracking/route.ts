import { NextRequest, NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/security/cron-auth';
import { query } from '@/lib/db/db';

export const maxDuration = 60;

// Table, timestamp column, days to keep. Learning data (submissions, progress,
// time on problems, session watch) is never touched here.
const RETENTION: Array<{ table: string; column: string; days: number }> = [
    { table: 'user_activity', column: 'created_at', days: 45 },
    { table: 'error_logs', column: 'created_at', days: 14 },
    { table: 'app_error_logs', column: 'created_at', days: 14 },
    { table: 'user_sessions', column: 'started_at', days: 60 },
    { table: 'login_logs', column: 'logged_in_at', days: 180 },
];
const BATCH = 20_000;

// Registration and submission rows keep their data, but the network address and browser string
// that came with them are dropped after 90 days.
const SCRUB: Array<{ table: string; column: string; fields: string[] }> = [
    { table: 'applications', column: 'submitted_at', fields: ['ip_address', 'user_agent'] },
    { table: 'level0_training_registrations', column: 'submitted_at', fields: ['ip_address', 'user_agent'] },
    { table: 'level1_training_registrations', column: 'submitted_at', fields: ['ip_address', 'user_agent'] },
    { table: 'student_card_uploads', column: 'created_at', fields: ['ip_address', 'user_agent'] },
    { table: 'team_registrations', column: 'created_at', fields: ['ip_address', 'user_agent'] },
    { table: 'submissions', column: 'submitted_at', fields: ['ip_address'] },
];

/**
 * Daily Vercel cron (see vercel.json). Deletes old tracking rows in batches, and clears old IP
 * addresses and browser strings from registration tables. so a
 * large backlog never holds a long lock; a run that hits its time budget carries on
 * the next day. Needs CRON_SECRET, like the other cron routes.
 */
export async function GET(req: NextRequest) {
    if (!process.env.CRON_SECRET) return NextResponse.json({ error: 'CRON_SECRET is not set' }, { status: 503 });
    if (!isCronAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const started = Date.now();
    const deleted: Record<string, number> = {};
    let timedOut = false;
    for (const { table, column, days } of RETENTION) {
        deleted[table] = 0;
        for (;;) {
            if (Date.now() - started > 45_000) { timedOut = true; break; }
            const res = await query(
                `DELETE FROM ${table} WHERE ctid IN (
                     SELECT ctid FROM ${table} WHERE ${column} < NOW() - ($1 || ' days')::interval LIMIT ${BATCH})`,
                [String(days)]
            );
            deleted[table] += res.rowCount || 0;
            if ((res.rowCount || 0) < BATCH) break;
        }
        if (timedOut) break;
    }
    const scrubbed: Record<string, number> = {};
    for (const { table, column, fields } of SCRUB) {
        if (Date.now() - started > 50_000) { timedOut = true; break; }
        const set = fields.map(f => `${f} = NULL`).join(', ');
        const any = fields.map(f => `${f} IS NOT NULL`).join(' OR ');
        const res = await query(`UPDATE ${table} SET ${set} WHERE ${column} < NOW() - INTERVAL '90 days' AND (${any})`);
        scrubbed[table] = res.rowCount || 0;
    }
    return NextResponse.json({ success: true, deleted, scrubbed, timedOut });
}
