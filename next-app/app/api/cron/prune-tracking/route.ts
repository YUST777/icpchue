import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/db';

export const maxDuration = 60;

// Table, timestamp column, days to keep. Learning data (submissions, progress,
// time on problems, session watch) is never touched here.
const RETENTION: Array<{ table: string; column: string; days: number }> = [
    { table: 'user_activity', column: 'created_at', days: 90 },
    { table: 'error_logs', column: 'created_at', days: 30 },
    { table: 'user_sessions', column: 'started_at', days: 90 },
    { table: 'login_logs', column: 'logged_in_at', days: 180 },
];
const BATCH = 20_000;

/**
 * Daily Vercel cron (see vercel.json). Deletes old tracking rows in batches so a
 * large backlog never holds a long lock; a run that hits its time budget carries on
 * the next day. Needs CRON_SECRET, like the other cron routes.
 */
export async function GET(req: NextRequest) {
    const secret = process.env.CRON_SECRET;
    if (!secret) return NextResponse.json({ error: 'CRON_SECRET is not set' }, { status: 503 });
    if (req.headers.get('authorization') !== `Bearer ${secret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
    return NextResponse.json({ success: true, deleted, timedOut });
}
