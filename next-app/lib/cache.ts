import { redis } from './redis';

/**
 * In-memory latch for pending Redis fetches to prevent dog-piling
 * within a single server instance.
 */
const pendingPromises = new Map<string, Promise<any>>();

/**
 * Higher-order function to wrap an API handler with Redis caching.
 * Includes dog-piling protection to ensure only one fetcher executes
 * simultaneously for the same key.
 * 
 * @param key The cache key
 * @param ttl Time to live in seconds
 * @param fetcher Async function that fetches data if cache misses
 */
export async function getCachedData<T>(
    key: string,
    ttl: number,
    fetcher: () => Promise<T>
): Promise<T> {
    // 1. Double-check latch first (Dog-piling protection)
    if (pendingPromises.has(key)) {
        return pendingPromises.get(key);
    }

    const fetchAndCache = (async () => {
        // 2. Try to get from Redis
        try {
            const cached = await redis.get(key);
            if (cached) {
                return JSON.parse(cached);
            }
        } catch (redisError) {
            console.error(`[Cache] Redis read error for key ${key}:`, redisError);
            // Proceed to fetch fresh data
        }

        // 3. Cache miss or Redis error: Fetch fresh data
        // If this throws, it bubbles up to the caller (no double fetch)
        const data = await fetcher();

        // 4. Store in Redis
        try {
            await redis.set(key, JSON.stringify(data), 'EX', ttl);
        } catch (redisError) {
            console.error(`[Cache] Redis write error for key ${key}:`, redisError);
        }

        return data;
    })();

    pendingPromises.set(key, fetchAndCache);

    // Ensure we clean up the map when the promise settles (success or fail)
    fetchAndCache.finally(() => {
        pendingPromises.delete(key);
    });

    return fetchAndCache;
}

/**
 * Invalidate a specific cache key
 */
export async function invalidateCache(key: string): Promise<void> {
    try {
        await redis.del(key);
        // Also remove from any pending promises if they exist
        pendingPromises.delete(key);
    } catch (error) {
        console.error(`[Cache] Invalidation error for key ${key}:`, error);
    }
}

/**
 * Basic Get cache
 */
export async function getCache<T>(key: string): Promise<T | null> {
    try {
        const cached = await redis.get(key);
        return cached ? JSON.parse(cached) : null;
    } catch (e) {
        console.error(`[Cache] Get error:`, e);
        return null;
    }
}

/**
 * Basic Set cache
 */
export async function setCache(key: string, data: any, ttl: number): Promise<void> {
    try {
        await redis.set(key, JSON.stringify(data), 'EX', ttl);
    } catch (e) {
        console.error(`[Cache] Set error:`, e);
    }
}

