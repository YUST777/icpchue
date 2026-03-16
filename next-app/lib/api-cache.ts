/**
 * Simple client-side cache to prevent redundant API calls during the same session.
 */

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    expiry: number;
}

const memoryCache = new Map<string, CacheEntry<any>>();
const pendingRequests = new Map<string, Promise<any>>();
const MAX_CACHE_SIZE = 100; // Prevent memory leak

/**
 * Enhanced fetch with caching and dog-piling protection.
 * If multiple components request the same URL simultaneously, only one network request is made.
 */
export async function fetchWithCache<T>(
    url: string,
    options: RequestInit = {},
    ttlSeconds: number = 60
): Promise<T> {
    const cacheKey = `${options.method || 'GET'}:${url}`;
    const now = Date.now();

    // 1. Check if we have valid non-expired cached data
    const entry = memoryCache.get(cacheKey);
    if (entry && (now < entry.expiry)) {
        return entry.data;
    }

    // 2. Dog-piling protection: check if a request for this key is already in flight
    if (pendingRequests.has(cacheKey)) {
        return pendingRequests.get(cacheKey);
    }

    // 3. Fetch fresh data
    const fetchPromise = (async () => {
        try {
            const res = await fetch(url, options);

            if (!res.ok) {
                // If it's a 401/403, we should let the caller handle it (usually logout)
                throw new Error(`API error: ${res.status}`);
            }

            const data = await res.json();

            // Cache eviction: keep memory footprint small
            if (memoryCache.size >= MAX_CACHE_SIZE) {
                const firstKey = memoryCache.keys().next().value;
                if (firstKey) memoryCache.delete(firstKey);
            }

            memoryCache.set(cacheKey, {
                data,
                timestamp: now,
                expiry: now + (ttlSeconds * 1000)
            });

            return data;
        } catch (err: any) {
            if (err.name === 'AbortError') {
                console.log(`Fetch aborted: ${url}`);
            }
            throw err;
        } finally {
            // Cleanup pending request list regardless of success/fail/abort
            pendingRequests.delete(cacheKey);
        }
    })();

    pendingRequests.set(cacheKey, fetchPromise);
    return fetchPromise;
}

/**
 * Clear the entire cache (e.g., on logout)
 */
export function clearApiCache() {
    memoryCache.clear();
    pendingRequests.clear();
}

/**
 * Force invalidate a single key
 */
export function invalidatePath(url: string, method: string = 'GET') {
    memoryCache.delete(`${method}:${url}`);
}
