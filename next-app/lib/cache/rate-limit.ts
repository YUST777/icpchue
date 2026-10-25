import { query } from '../db/db';

// Postgres (Supabase) is the distributed limiter: every serverless instance
// shares the same counters through public.app_rate_limits. Keep a bounded
// local fallback for transient database outages so authentication, OTP,
// upload, and admin endpoints do not silently become unlimited.
const localWindows = new Map<string, { count: number; resetAt: number }>();
const LOCAL_MAX_KEYS = 5000;
const CLEANUP_PROBABILITY = 0.01;

function localRateLimit(key: string, limit: number, windowSeconds: number): RateLimitResult {
    const now = Date.now();
    const current = localWindows.get(key);

    if (!current || current.resetAt <= now) {
        if (localWindows.size >= LOCAL_MAX_KEYS) {
            // Evict one expired entry first; if all are active, evict the
            // oldest insertion to keep attacker-controlled keys bounded.
            const expired = Array.from(localWindows.entries()).find(([, value]) => value.resetAt <= now);
            localWindows.delete(expired?.[0] || localWindows.keys().next().value || key);
        }
        const next = { count: 1, resetAt: now + windowSeconds * 1000 };
        localWindows.set(key, next);
        return { success: true, limit, remaining: Math.max(0, limit - 1), reset: next.resetAt };
    }

    current.count += 1;
    return {
        success: current.count <= limit,
        limit,
        remaining: Math.max(0, limit - current.count),
        reset: current.resetAt,
    };
}

// Chatty, signed-in, low-risk endpoints (autosave, tracking, polling) count in this process
// instead of in Postgres. That saves one database round trip on every one of those calls, at
// the cost of a limit that is per server instance, which is fine for stopping a runaway loop.
// Login, OTP, registration, password, upload and form endpoints stay on the shared limiter.
const LOCAL_ONLY_PREFIXES = [
    'workspace_sync', 'views', 'track', 'nav', 'tests_', 'streak_view', 'privacy_view',
    'prefs_', 'notes_', 'dashboard_stats', 'code_save', 'code_get', 'cf_user_subs',
    'cf_submissions_list', 'client-errors',
];

export interface RateLimitResult {
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
}

/**
 * Fixed-window rate limiter backed by Postgres.
 * @param key Identifier for the rate limit (e.g. IP address or User ID)
 * @param limit Max requests allowed in the window
 * @param windowSeconds Duration of the window in seconds
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    if (LOCAL_ONLY_PREFIXES.some(prefix => key.startsWith(prefix))) return localRateLimit(key, limit, windowSeconds);
    try {
        const result = await query<{ hit_count: number; reset_at: Date }>(
            'SELECT hit_count, reset_at FROM public.app_rate_limit_hit($1, $2)',
            [key.slice(0, 512), Math.max(1, Math.floor(windowSeconds))]
        );
        const row = result.rows[0];
        if (!row) throw new Error('Rate limit function returned no row');

        // Opportunistically drop long-expired windows so the table stays small.
        if (Math.random() < CLEANUP_PROBABILITY) {
            query("DELETE FROM public.app_rate_limits WHERE reset_at < now() - interval '1 hour'").catch(() => {});
        }

        const count = Number(row.hit_count);
        return {
            success: count <= limit,
            limit,
            remaining: Math.max(0, limit - count),
            reset: new Date(row.reset_at).getTime(),
        };
    } catch (error) {
        console.warn('[RateLimit] Postgres limiter failed; using bounded local fallback:', error instanceof Error ? error.message : error);
        return localRateLimit(key, limit, windowSeconds);
    }
}
