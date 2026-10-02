import { query } from '../db/db';

/**
 * Short-lived JSON cache stored in Postgres (public.app_cache), shared by all
 * serverless instances, so invalidation is immediate everywhere. An in-flight
 * latch prevents dog-piling within one instance. Every failure degrades to
 * calling the fetcher, never to an error.
 */

const pendingPromises = new Map<string, Promise<any>>();
const CLEANUP_PROBABILITY = 0.01;

/**
 * Basic Get cache
 */
export async function getCache<T>(key: string): Promise<T | null> {
    try {
        const result = await query<{ value: T }>(
            'SELECT value FROM public.app_cache WHERE key = $1 AND expires_at > now()',
            [key]
        );
        return result.rows[0]?.value ?? null;
    } catch (e) {
        console.error('[Cache] Get error:', e instanceof Error ? e.message : e);
        return null;
    }
}

/**
 * Basic Set cache
 */
export async function setCache(key: string, data: any, ttl: number): Promise<void> {
    if (data === undefined) return;
    try {
        await query(
            `INSERT INTO public.app_cache (key, value, expires_at)
             VALUES ($1, $2::jsonb, now() + make_interval(secs => $3))
             ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, expires_at = EXCLUDED.expires_at`,
            [key, JSON.stringify(data), Math.max(1, Math.floor(ttl))]
        );
        if (Math.random() < CLEANUP_PROBABILITY) {
            query('DELETE FROM public.app_cache WHERE expires_at < now()').catch(() => {});
        }
    } catch (e) {
        console.error('[Cache] Set error:', e instanceof Error ? e.message : e);
    }
}

/**
 * Wrap a fetcher with caching and dog-piling protection so only one fetch
 * runs per key per instance at a time.
 */
export async function getCachedData<T>(
    key: string,
    ttl: number,
    fetcher: () => Promise<T>
): Promise<T> {
    if (pendingPromises.has(key)) {
        return pendingPromises.get(key);
    }

    const fetchAndCache = (async () => {
        const cached = await getCache<T>(key);
        if (cached !== null) return cached;

        // If this throws, it bubbles up to the caller (no double fetch).
        const data = await fetcher();
        await setCache(key, data, ttl);
        return data;
    })();

    pendingPromises.set(key, fetchAndCache);
    fetchAndCache.finally(() => {
        pendingPromises.delete(key);
    }).catch(() => {});

    return fetchAndCache;
}

/**
 * Invalidate a specific cache key
 */
export async function invalidateCache(key: string): Promise<void> {
    pendingPromises.delete(key);
    try {
        await query('DELETE FROM public.app_cache WHERE key = $1', [key]);
    } catch (error) {
        console.error(`[Cache] Invalidation error for key ${key}:`, error instanceof Error ? error.message : error);
    }
}
