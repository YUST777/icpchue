'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Tracks page navigation + device context automatically.
 * Records every page visit with time spent, and sends device info once per session.
 */
export function usePageTracking() {
    const pathname = usePathname();
    const enterTimeRef = useRef(Date.now());
    const lastPathRef = useRef<string | null>(null);
    const contextSentRef = useRef(false);

    // Send device context once per session
    useEffect(() => {
        if (contextSentRef.current) return;
        contextSentRef.current = true;

        const sessionId = sessionStorage.getItem('icpchue-session-id') || '';
        const context = {
            type: 'device_context',
            sessionId,
            screen: { w: screen.width, h: screen.height },
            viewport: { w: window.innerWidth, h: window.innerHeight },
            pixelRatio: window.devicePixelRatio,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            language: navigator.language,
            cookiesEnabled: navigator.cookieEnabled,
            online: navigator.onLine,
            // @ts-expect-error — connection API is not in all browsers
            connection: navigator.connection ? {
                // @ts-expect-error
                type: navigator.connection.effectiveType,
                // @ts-expect-error
                downlink: navigator.connection.downlink,
                // @ts-expect-error
                rtt: navigator.connection.rtt,
            } : null,
            referrer: document.referrer || null,
            utmSource: new URLSearchParams(window.location.search).get('utm_source'),
            utmMedium: new URLSearchParams(window.location.search).get('utm_medium'),
            utmCampaign: new URLSearchParams(window.location.search).get('utm_campaign'),
        };

        fetch('/api/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                action: 'session_start',
                sessionId,
                metadata: context,
            }),
            keepalive: true,
        }).catch(() => {});
    }, []);

    // Track page navigation
    useEffect(() => {
        const sessionId = sessionStorage.getItem('icpchue-session-id') || '';

        // Record leaving old page (debounced, non-blocking)
        if (lastPathRef.current && lastPathRef.current !== pathname) {
            const timeSpent = Date.now() - enterTimeRef.current;
            const oldPath = lastPathRef.current;
            // Use requestIdleCallback to avoid blocking navigation
            const send = () => {
                fetch('/api/track/navigation', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ page: oldPath, sessionId, timeSpent, leftPage: true }),
                    keepalive: true,
                }).catch(() => {});
            };
            if ('requestIdleCallback' in window) {
                (window as any).requestIdleCallback(send, { timeout: 2000 });
            } else {
                setTimeout(send, 100);
            }
        }

        lastPathRef.current = pathname;
        enterTimeRef.current = Date.now();

        // Record entering new page (delayed to not block render)
        const timer = setTimeout(() => {
            fetch('/api/track/navigation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ page: pathname, referrer: document.referrer || null, sessionId }),
                keepalive: true,
            }).catch(() => {});
        }, 500); // 500ms delay — let the page render first

        // Record leaving on unload
        const handleUnload = () => {
            const timeSpent = Date.now() - enterTimeRef.current;
            try {
                navigator.sendBeacon('/api/track/navigation', JSON.stringify({
                    page: pathname, sessionId, timeSpent, leftPage: true,
                }));
            } catch { /* */ }
        };

        window.addEventListener('beforeunload', handleUnload);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('beforeunload', handleUnload);
        };
    }, [pathname]);

    // Track JS errors
    useEffect(() => {
        const sessionId = sessionStorage.getItem('icpchue-session-id') || '';

        const handleError = (event: ErrorEvent) => {
            fetch('/api/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    action: 'error_encounter',
                    sessionId,
                    metadata: {
                        message: event.message?.slice(0, 500),
                        source: event.filename?.slice(-100),
                        line: event.lineno,
                        col: event.colno,
                        page: pathname,
                    },
                }),
                keepalive: true,
            }).catch(() => {});
        };

        const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
            const reason = event.reason?.message || String(event.reason);
            fetch('/api/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    action: 'error_encounter',
                    sessionId,
                    metadata: {
                        message: reason?.slice(0, 500),
                        type: 'unhandled_rejection',
                        page: pathname,
                    },
                }),
                keepalive: true,
            }).catch(() => {});
        };

        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleUnhandledRejection);
        return () => {
            window.removeEventListener('error', handleError);
            window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        };
    }, [pathname]);

    // Track online/offline transitions
    useEffect(() => {
        const sessionId = sessionStorage.getItem('icpchue-session-id') || '';

        const handleOnline = () => {
            fetch('/api/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ action: 'connection_online', sessionId, metadata: { page: pathname } }),
                keepalive: true,
            }).catch(() => {});
        };

        const handleOffline = () => {
            // Can't send when offline, but we can try sendBeacon
            try {
                navigator.sendBeacon('/api/track', JSON.stringify({
                    action: 'connection_offline', sessionId, metadata: { page: pathname },
                }));
            } catch { /* */ }
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [pathname]);
}
