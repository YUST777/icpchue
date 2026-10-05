import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/auth';
import { rateLimit } from '@/lib/cache/rate-limit';
import { query } from '@/lib/db/db';

// The client flushes every 30s; allow some slack for throttled background tabs.
const MAX_SECONDS_PER_BEAT = 120;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function seconds(value: unknown): number {
    const n = Math.floor(Number(value));
    return Number.isFinite(n) ? Math.min(MAX_SECONDS_PER_BEAT, Math.max(0, n)) : 0;
}

/**
 * Adds active/idle/away seconds to the current problem visit. Active time can
 * never exceed the wall-clock time since the previous beat, so a tampered
 * client cannot inflate it.
 */
export async function POST(req: NextRequest) {
    try {
        const user = await verifyAuth(req);
        if (!user) return NextResponse.json({ ok: false }, { status: 401 });

        const rl = await rateLimit(`track-time:${user.id}`, 20, 60);
        if (!rl.success) return NextResponse.json({ ok: false }, { status: 429 });

        // sendBeacon posts text/plain.
        const body = JSON.parse((await req.text()) || '{}');
        const visitId = String(body.visitId || '');
        const contestId = String(body.contestId || '');
        const problemIndex = String(body.problemIndex || '').toUpperCase();
        const sheetId = body.sheetId == null ? null : String(body.sheetId).slice(0, 20);
        if (!UUID_RE.test(visitId) || !/^\d{1,10}$/.test(contestId) || !/^[A-Z][0-9]?$/.test(problemIndex)) {
            return NextResponse.json({ ok: false, error: 'Invalid visit' }, { status: 400 });
        }

        const active = seconds(body.active);
        const idle = seconds(body.idle);
        const away = seconds(body.away);
        if (active + idle + away === 0) return NextResponse.json({ ok: true });

        await query(
            `INSERT INTO problem_time_sessions
                (user_id, visit_id, contest_id, problem_index, sheet_id, active_seconds, idle_seconds, away_seconds, started_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now() - make_interval(secs => $6::int + $7::int + $8::int))
             ON CONFLICT (user_id, visit_id) DO UPDATE SET
                active_seconds = problem_time_sessions.active_seconds + LEAST(
                    EXCLUDED.active_seconds,
                    GREATEST(0, EXTRACT(EPOCH FROM now() - problem_time_sessions.last_beat_at))::int + 5
                ),
                idle_seconds = problem_time_sessions.idle_seconds + EXCLUDED.idle_seconds,
                away_seconds = problem_time_sessions.away_seconds + EXCLUDED.away_seconds,
                last_beat_at = now()
             WHERE problem_time_sessions.contest_id = EXCLUDED.contest_id
               AND problem_time_sessions.problem_index = EXCLUDED.problem_index`,
            [user.id, visitId, contestId, problemIndex, sheetId, active, idle, away]
        );

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('[Track Time] Failed:', error instanceof Error ? error.message : error);
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}
