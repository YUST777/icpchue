import { redis } from '../db/redis';

// Redis is the distributed limiter in production. Keep a bounded local
// fallback for transient Redis outages so authentication, OTP, upload, and
// admin endpoints do not silently become unlimited. This is intentionally
// conservative: each server instance contributes its own limit, while Redis
// remains authoritative whenever it is healthy.
const localWindows = new Map<string, { count: number; resetAt: number }>();
const LOCAL_MAX_KEYS = 5000;

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

export interface RateLimitResult {
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
}

/**
 * Basic fixed-window rate limiter using Redis
 * @param key Identifier for the rate limit (e.g. IP address or User ID)
 * @param limit Max requests allowed in the window
 * @param windowSeconds Duration of the window in seconds
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    try {
        const redisKey = `rate_limit:${key}`;

        // Get current count
        const multi = redis.multi();
        multi.incr(redisKey);
        multi.ttl(redisKey);

        const results = await multi.exec();

        if (!results) {
            throw new Error('Redis transaction failed');
        }

        const [incrErr, newCount] = results[0];
        const [ttlErr, ttl] = results[1];

        if (incrErr || ttlErr) {
            throw new Error('Redis operation failed');
        }

        const count = newCount as number;
        let currentTtl = ttl as number;

        // If key is new (ttl == -1), set expiration
        if (currentTtl === -1) {
            await redis.expire(redisKey, windowSeconds);
            currentTtl = windowSeconds;
        }

        return {
            success: count <= limit,
            limit,
            remaining: Math.max(0, limit - count),
            reset: Date.now() + (currentTtl * 1000)
        };
    } catch (error) {
        console.warn(`[RateLimit] Redis rate limiter failed; using bounded local fallback:`, error);
        return localRateLimit(key, limit, windowSeconds);
    }
}
