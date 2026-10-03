/**
 * Browser-side reporter. Sends a compact error report to /api/client-errors.
 * Uses sendBeacon when possible so reports survive page unloads.
 */

type ClientErrorReport = {
    kind: 'error' | 'unhandledrejection' | 'react' | 'fetch';
    message: string;
    stack?: string | null;
    digest?: string | null;
    url?: string;
    method?: string;
    status?: number;
    source?: string;
    line?: number;
    column?: number;
};

const ENDPOINT = '/api/client-errors';
const MAX_PER_PAGE = 20;
let sent = 0;
const seen = new Set<string>();

export function reportClientError(report: ClientErrorReport) {
    if (typeof window === 'undefined') return;
    try {
        const key = `${report.kind}|${report.message}|${report.url || ''}`;
        if (seen.has(key) || sent >= MAX_PER_PAGE) return;
        seen.add(key);
        sent += 1;

        const payload = JSON.stringify({
            ...report,
            message: report.message.slice(0, 4000),
            stack: report.stack?.slice(0, 8000) ?? null,
            path: window.location.pathname + window.location.search.replace(/([?&])(token_hash|access_token|code)=[^&]*/g, '$1$2=[redacted]'),
            viewport: `${window.innerWidth}x${window.innerHeight}`,
            online: navigator.onLine,
        });

        const blob = new Blob([payload], { type: 'application/json' });
        if (navigator.sendBeacon && navigator.sendBeacon(ENDPOINT, blob)) return;
        // Use the untouched fetch so the fetch hook does not report itself.
        const nativeFetch = (window as unknown as { __icpchueNativeFetch?: typeof fetch }).__icpchueNativeFetch || window.fetch;
        void nativeFetch(ENDPOINT, { method: 'POST', body: payload, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => {});
    } catch {
        // Reporting must never throw.
    }
}

export function describeUnknown(value: unknown): { message: string; stack: string | null } {
    if (value instanceof Error) return { message: `${value.name}: ${value.message}`, stack: value.stack || null };
    if (typeof value === 'string') return { message: value, stack: null };
    try {
        return { message: JSON.stringify(value), stack: null };
    } catch {
        return { message: String(value), stack: null };
    }
}
