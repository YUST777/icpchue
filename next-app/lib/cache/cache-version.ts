// This forces browsers to fetch fresh data instead of using cached responses
// Bump this to invalidate auth/me cache (role, profile) across all users on deploy
export const CACHE_VERSION = '1.6';

// Full cache-busted URL helper
export function addCacheBust(url: string): string {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}_v=${CACHE_VERSION}`;
}
