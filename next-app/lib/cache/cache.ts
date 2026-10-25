import { query } from '../db/db';

/**
 * Short-lived JSON cache stored in Postgres (public.app_cache), shared by all
 * serverless instances, so invalidation is immediate everywhere. An in-flight
 * latch prevents dog-piling within one instance. Every failure degrades to
 * calling the fetcher, never to an error.
 */

const pendingPromises = new Map<string, Promise<any>>();

// Shared keys (leaderboards, curriculum, holder stats) are the same for everyone, so a warm server
// keeps them in memory for a few seconds and skips the database lookup. Per-user keys are never
// held here. Other servers can serve a value up to L1_MAX_MS old after an invalidation.
const L1_MAX_MS = 30_000;
const L1_MAX_KEYS = 300;
const l1 = new Map<string, { value: any; until: number }>();
const isShared = (key: string) => !key.startsWith('user:');
const l1Get = (key: string) => {
    const hit = l1.get(key);
    if (!hit) return undefined;
    if (hit.until <= Date.now()) { l1.delete(key); return undefined; }
    return hit.value;
};
const l1Set = (key: string, value: any, ttlSeconds: number) => {
    if (!isShared(key) || value === null || value === undefined) return;
    if (l1.size >= L1_MAX_KEYS) l1.delete(l1.keys().next().value as string);
    l1.set(key, { value, until: Date.now() + Math.min(L1_MAX_MS, ttlSeconds * 1000) });
};
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
        const local = l1Get(key);
        if (local !== undefined) return local as T;

        const cached = await getCache<T>(key);
        if (cached !== null) { l1Set(key, cached, ttl); return cached; }

        // If this throws, it bubbles up to the caller (no double fetch).
        const data = await fetcher();
        await setCache(key, data, ttl);
        l1Set(key, data, ttl);
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
    l1.delete(key);
    try {
        await query('DELETE FROM public.app_cache WHERE key = $1', [key]);
    } catch (error) {
        console.error(`[Cache] Invalidation error for key ${key}:`, error instanceof Error ? error.message : error);
    }
}

/**
 * Invalidate every cache key that starts with `prefix` (for example all of
 * one user's sheet/solved/details caches after a sync).
 */
export async function invalidateCachePrefix(prefix: string): Promise<void> {
    if (!prefix) return;
    for (const key of Array.from(pendingPromises.keys())) {
        if (key.startsWith(prefix)) pendingPromises.delete(key);
    }
    for (const key of Array.from(l1.keys())) {
        if (key.startsWith(prefix)) l1.delete(key);
    }
    try {
        const escaped = prefix.replace(/[\\%_]/g, (c) => `\\${c}`);
        await query(`DELETE FROM public.app_cache WHERE key LIKE $1 ESCAPE '\\'`, [`${escaped}%`]);
    } catch (error) {
        console.error(`[Cache] Prefix invalidation error for ${prefix}:`, error instanceof Error ? error.message : error);
    }
}
