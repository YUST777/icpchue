/**
 * Simple client-side cache to prevent redundant API calls during the same session
 * and provide instant Zero-Skeleton navigation (Stale-While-Revalidate).
 */

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    expiry: number;
}

const memoryCache = new Map<string, CacheEntry<any>>();
const pendingRequests = new Map<string, Promise<any>>();
const MAX_CACHE_SIZE = 100; // Prevent memory leak

const STORAGE_PREFIX = 'api_cache_';

/**
 * Synchronous cache lookup for instantaneous initial render without flashing skeletons.
 */
export function getCachedData<T>(url: string, method: string = 'GET'): T | null {
    const cacheKey = `${method}:${url}`;
    const now = Date.now();

    // 1. Check in-memory cache first (fastest)
    const entry = memoryCache.get(cacheKey);
    if (entry && now < entry.expiry) {
        return entry.data as T;
    }

    // 2. Check sessionStorage if in browser environment
    if (typeof window !== 'undefined') {
        try {
            const raw = sessionStorage.getItem(STORAGE_PREFIX + cacheKey);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && now < parsed.expiry) {
                    // Rehydrate memory cache
                    memoryCache.set(cacheKey, parsed);
                    return parsed.data as T;
                } else {
                    sessionStorage.removeItem(STORAGE_PREFIX + cacheKey);
                }
            }
        } catch {
            // Ignore storage parse errors
        }
    }

    return null;
}

/**
 * Enhanced fetch with caching, dog-piling protection, and session persistence.
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
    const cached = getCachedData<T>(url, (options.method as string) || 'GET');
    if (cached !== null) {
        return cached;
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
                throw new Error(`API error: ${res.status}`);
            }

            const data = await res.json();

            // Cache eviction: keep memory footprint small
            if (memoryCache.size >= MAX_CACHE_SIZE) {
                const firstKey = memoryCache.keys().next().value;
                if (firstKey) memoryCache.delete(firstKey);
            }

            const cacheItem: CacheEntry<T> = {
                data,
                timestamp: now,
                expiry: now + (ttlSeconds * 1000)
            };

            memoryCache.set(cacheKey, cacheItem);

            // Persist to sessionStorage for seamless back-navigation
            if (typeof window !== 'undefined') {
                try {
                    sessionStorage.setItem(STORAGE_PREFIX + cacheKey, JSON.stringify(cacheItem));
                } catch {
                    // Ignore quota errors
                }
            }

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
    if (typeof window !== 'undefined') {
        try {
            const keysToRemove: string[] = [];
            for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                if (key && key.startsWith(STORAGE_PREFIX)) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(k => sessionStorage.removeItem(k));
        } catch {}
    }
}

/**
 * Force invalidate a single key
 */
export function invalidatePath(url: string, method: string = 'GET') {
    const cacheKey = `${method}:${url}`;
    memoryCache.delete(cacheKey);
    if (typeof window !== 'undefined') {
        try {
            sessionStorage.removeItem(STORAGE_PREFIX + cacheKey);
        } catch {}
    }
}
