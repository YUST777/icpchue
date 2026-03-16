import { redis } from './redis';

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
}
