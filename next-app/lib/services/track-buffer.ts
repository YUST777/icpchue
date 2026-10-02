import { query } from '../db/db';

/**
 * Activity tracking writes straight to Postgres (public.user_activity).
 *
 * This used to buffer events in a Redis list and flush them in batches, but
 * Redis is not available on the serverless deployment, so every event was
 * dropped. The exported API is kept so existing callers keep working.
 */

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

/** Record a single activity event. */
export async function pushEvent(e: BufferedEvent): Promise<void> {
    await query(
        `INSERT INTO user_activity
            (user_id, session_id, action, contest_id, problem_id, sheet_id, metadata, ip_address, user_agent, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [e.user_id, e.session_id, e.action, e.contest_id, e.problem_id, e.sheet_id, e.metadata, e.ip_address, e.user_agent, e.created_at]
    );
}

/** Events are written immediately, so there is never a buffer to flush. */
export async function flushEvents(): Promise<number> {
    return 0;
}

/** Kept for API compatibility; no timer is needed without a buffer. */
export function startFlushTimer(): void {}
