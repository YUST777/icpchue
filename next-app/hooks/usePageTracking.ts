'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Tracks page navigation automatically.
 * Records every page visit with time spent.
 */
export function usePageTracking() {
    const pathname = usePathname();
    const enterTimeRef = useRef(Date.now());
    const lastPathRef = useRef(pathname);

    useEffect(() => {
        const sessionId = typeof sessionStorage !== 'undefined'
            ? sessionStorage.getItem('icpchue-session-id') || ''
            : '';

        // If path changed, record leaving the old page and entering the new one
        if (lastPathRef.current !== pathname) {
            const timeSpent = Date.now() - enterTimeRef.current;

            // Record leaving old page
            if (lastPathRef.current) {
                fetch('/api/track/navigation', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        page: lastPathRef.current,
                        sessionId,
                        timeSpent,
                        leftPage: true,
                    }),
                    keepalive: true,
                }).catch(() => {});
            }

            lastPathRef.current = pathname;
            enterTimeRef.current = Date.now();
        }

        // Record entering new page
        fetch('/api/track/navigation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                page: pathname,
                referrer: typeof document !== 'undefined' ? document.referrer : null,
                sessionId,
            }),
            keepalive: true,
        }).catch(() => {});

        // Record leaving on page unload
        const handleUnload = () => {
            const timeSpent = Date.now() - enterTimeRef.current;
            try {
                navigator.sendBeacon('/api/track/navigation', JSON.stringify({
                    page: pathname,
                    sessionId,
                    timeSpent,
                    leftPage: true,
                }));
            } catch {
                // fallback
            }
        };

        window.addEventListener('beforeunload', handleUnload);
        return () => window.removeEventListener('beforeunload', handleUnload);
    }, [pathname]);
}
