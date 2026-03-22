import { redis } from './redis';
import { query } from './db';

/**
 * Redis-buffered event tracking.
 * Events are pushed to a Redis list and flushed to Postgres in batches.
 * This avoids hammering Postgres with individual INSERTs on every click/keystroke.
 */

const REDIS_KEY = 'track:buffer';
const FLUSH_THRESHOLD = 50;   // flush when buffer hits 50 events
const FLUSH_INTERVAL = 10000; // or every 10 seconds

interface BufferedEvent {
    user_id: number;
    session_id: string;
    action: string;
    contest_id: string | null;
    problem_id: string | null;
    sheet_id: string | null;
    metadata: string; // JSON string
    ip_address: string | null;
    user_agent: string | null;
    created_at: string; // ISO timestamp
}

/** Push a single event into the Redis buffer */
export async function pushEvent(event: BufferedEvent): Promise<void> {
    const len = await redis.rpush(REDIS_KEY, JSON.stringify(event));
    // Auto-flush if buffer is large enough
    if (len >= FLUSH_THRESHOLD) {
        flushEvents().catch(() => {});
    }
}

/** Flush all buffered events to Postgres in a single batch INSERT */
export async function flushEvents(): Promise<number> {
    // Atomically grab up to 200 events
    const pipe = redis.pipeline();
    pipe.lrange(REDIS_KEY, 0, 199);
    pipe.ltrim(REDIS_KEY, 200, -1);
    const results = await pipe.exec();

    if (!results || !results[0] || !results[0][1]) return 0;

    const rawEvents = results[0][1] as string[];
    if (rawEvents.length === 0) return 0;

    const events: BufferedEvent[] = rawEvents.map(s => JSON.parse(s));

    // Build a single multi-row INSERT
    const values: unknown[] = [];
    const placeholders: string[] = [];
    let idx = 1;

    for (const e of events) {
        placeholders.push(`($${idx}, $${idx+1}, $${idx+2}, $${idx+3}, $${idx+4}, $${idx+5}, $${idx+6}, $${idx+7}, $${idx+8}, $${idx+9})`);
        values.push(
            e.user_id, e.session_id, e.action,
            e.contest_id, e.problem_id, e.sheet_id,
            e.metadata, e.ip_address, e.user_agent, e.created_at
        );
        idx += 10;
    }

    const sql = `
        INSERT INTO user_activity 
            (user_id, session_id, action, contest_id, problem_id, sheet_id, metadata, ip_address, user_agent, created_at)
        VALUES ${placeholders.join(', ')}
    `;

    try {
        await query(sql, values);
    } catch (err) {
        // On failure, push events back to Redis so they're not lost
        console.error('[track-buffer] Flush failed, re-queuing:', err);
        const pipe2 = redis.pipeline();
        for (const raw of rawEvents) {
            pipe2.lpush(REDIS_KEY, raw);
        }
        await pipe2.exec();
    }

    return events.length;
}

// Periodic flush timer (singleton)
let flushTimer: ReturnType<typeof setInterval> | null = null;

export function startFlushTimer(): void {
    if (flushTimer) return;
    flushTimer = setInterval(() => {
        flushEvents().catch(() => {});
    }, FLUSH_INTERVAL);
}

// Auto-start the timer on import
startFlushTimer();
