'use client';

import { addCacheBust } from './cache/cache-version';

interface FetchOptions extends RequestInit {
    headers?: Record<string, string>;
}

export async function fetchWithAuth(url: string, options: FetchOptions = {}) {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    const finalUrl = addCacheBust(url);

    try {
        const response = await fetch(finalUrl, {
            ...options,
            headers,
            credentials: 'include',
        });

        if (response.status === 401) {
            if (typeof window !== 'undefined') {
                console.warn('[API] 401 Unauthorized - Redirecting to login...');
                // Clear legacy tokens
                localStorage.removeItem('authToken');
                document.cookie = 'authToken=; Max-Age=0; path=/;';
                window.location.href = '/login?expired=true';
                return;
            }
        }

        return response;
    } catch (error) {
        console.error('[API] Network Error:', error);
        throw error;
    }
}
