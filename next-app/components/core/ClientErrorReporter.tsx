'use client';

import { useEffect } from 'react';
import { describeUnknown, reportClientError } from '@/lib/observability/report-client-error';

// Expected API answers that are not bugs (wrong password, logged out, etc.).
const EXPECTED_STATUSES = new Set([401, 403, 404, 409]);

/**
 * Captures uncaught browser errors, unhandled promise rejections, and failed
 * calls to our own /api routes (5xx, 429, and network failures), so they are
 * stored in app_error_logs alongside server errors.
 */
export default function ClientErrorReporter() {
    useEffect(() => {
        const onError = (event: ErrorEvent) => {
            // Ignore cross-origin "Script error." with no detail and extension noise.
            if (!event.message || event.message === 'Script error.') return;
            if (event.filename && !event.filename.startsWith(window.location.origin)) return;
            reportClientError({
                kind: 'error',
                message: event.message,
                stack: event.error instanceof Error ? event.error.stack : null,
                source: event.filename,
                line: event.lineno,
                column: event.colno,
            });
        };

        const onRejection = (event: PromiseRejectionEvent) => {
            const { message, stack } = describeUnknown(event.reason);
            if (/AbortError|The user aborted a request/i.test(message)) return;
            reportClientError({ kind: 'unhandledrejection', message, stack });
        };

        window.addEventListener('error', onError);
        window.addEventListener('unhandledrejection', onRejection);

        const w = window as unknown as { __icpchueNativeFetch?: typeof fetch };
        const nativeFetch = w.__icpchueNativeFetch || window.fetch;
        w.__icpchueNativeFetch = nativeFetch;

        const trackedFetch: typeof fetch = async (input, init) => {
            const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
            const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
            let path = '';
            try {
                const parsed = new URL(url, window.location.origin);
                if (parsed.origin === window.location.origin) path = parsed.pathname;
            } catch {
                // ignore
            }
            const watched = path.startsWith('/api/') && path !== '/api/client-errors';

            // Weak mobile connections drop requests. Retry safe GETs to our
            // own API a couple of times before giving up.
            const retryable = watched && method === 'GET' && !init?.signal?.aborted;
            const attempt = async (): Promise<Response> => {
                const delays = retryable ? [600, 1800] : [];
                for (let i = 0; ; i += 1) {
                    try {
                        return await nativeFetch(input, init);
                    } catch (error) {
                        const aborted = error instanceof DOMException && error.name === 'AbortError';
                        if (aborted || i >= delays.length || init?.signal?.aborted) throw error;
                        await new Promise((r) => setTimeout(r, delays[i]));
                    }
                }
            };

            try {
                const response = await attempt();
                // 400/429 answers are the API's own validation messages shown to the user.
                if (watched && !response.ok && !EXPECTED_STATUSES.has(response.status) && response.status >= 500) {
                    let detail = '';
                    try {
                        detail = (await response.clone().text()).slice(0, 300);
                    } catch {
                        // ignore
                    }
                    reportClientError({
                        kind: 'fetch',
                        message: `${method} ${path} -> ${response.status}${detail ? `: ${detail}` : ''}`,
                        url: path,
                        method,
                        status: response.status,
                    });
                }
                return response;
            } catch (error) {
                // Offline phones are not a bug; only report failures while online.
                if (watched && navigator.onLine && !(error instanceof DOMException && error.name === 'AbortError')) {
                    reportClientError({
                        kind: 'fetch',
                        message: `${method} ${path} -> network error: ${describeUnknown(error).message}`,
                        url: path,
                        method,
                        status: 0,
                    });
                }
                throw error;
            }
        };
        window.fetch = trackedFetch;

        return () => {
            window.removeEventListener('error', onError);
            window.removeEventListener('unhandledrejection', onRejection);
            if (window.fetch === trackedFetch) window.fetch = nativeFetch;
        };
    }, []);

    return null;
}
