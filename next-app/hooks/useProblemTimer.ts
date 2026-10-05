import { useEffect } from 'react';

// No keyboard/mouse/scroll input for this long counts as idle (reading a
// statement without touching anything still counts as active until then).
const IDLE_AFTER_MS = 90_000;
const TICK_MS = 1_000;
const FLUSH_MS = 30_000;
const ENDPOINT = '/api/track/time';

function newVisitId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
    // RFC 4122 v4 fallback for older browsers.
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
}

/**
 * Measures how long a trainee actively works on a problem. Each page visit is
 * one session; every second is counted as active, idle, or away (tab hidden),
 * and the totals are sent to the server every 30s and when the page is left.
 */
export function useProblemTimer({ contestId, problemIndex, sheetId }: {
    contestId?: string | number | null;
    problemIndex?: string | null;
    sheetId?: string | number | null;
}) {
    useEffect(() => {
        if (!contestId || !problemIndex) return;

        const visitId = newVisitId();
        const totals = { active: 0, idle: 0, away: 0 };
        let lastInputAt = Date.now();
        let lastTickAt = Date.now();

        const markInput = () => { lastInputAt = Date.now(); };

        // Attribute the time since the previous tick to the current state. Using
        // wall-clock deltas keeps counts right when hidden tabs throttle timers.
        const tick = () => {
            const now = Date.now();
            const ms = Math.min(now - lastTickAt, FLUSH_MS * 2);
            lastTickAt = now;
            if (ms <= 0) return;
            if (document.hidden) totals.away += ms;
            else if (now - lastInputAt <= IDLE_AFTER_MS) totals.active += ms;
            else totals.idle += ms;
        };

        const flush = (useBeacon: boolean) => {
            tick();
            const payload = {
                visitId,
                contestId: String(contestId),
                problemIndex: String(problemIndex),
                sheetId: sheetId == null ? null : String(sheetId),
                active: Math.floor(totals.active / 1000),
                idle: Math.floor(totals.idle / 1000),
                away: Math.floor(totals.away / 1000),
            };
            if (payload.active + payload.idle + payload.away === 0) return;
            // Keep the sub-second remainder for the next flush.
            totals.active -= payload.active * 1000;
            totals.idle -= payload.idle * 1000;
            totals.away -= payload.away * 1000;

            const body = JSON.stringify(payload);
            if (useBeacon && navigator.sendBeacon?.(ENDPOINT, new Blob([body], { type: 'text/plain' }))) return;
            fetch(ENDPOINT, { method: 'POST', body, keepalive: true, credentials: 'include' }).catch(() => {});
        };

        const onVisibility = () => {
            if (document.hidden) flush(true);
            else { tick(); markInput(); }
        };
        const onPageHide = () => flush(true);

        const inputEvents = ['keydown', 'mousedown', 'mousemove', 'wheel', 'touchstart', 'scroll'] as const;
        inputEvents.forEach((e) => window.addEventListener(e, markInput, { passive: true, capture: true }));
        document.addEventListener('visibilitychange', onVisibility);
        window.addEventListener('pagehide', onPageHide);
        const tickTimer = setInterval(tick, TICK_MS);
        const flushTimer = setInterval(() => flush(false), FLUSH_MS);

        return () => {
            clearInterval(tickTimer);
            clearInterval(flushTimer);
            inputEvents.forEach((e) => window.removeEventListener(e, markInput, { capture: true }));
            document.removeEventListener('visibilitychange', onVisibility);
            window.removeEventListener('pagehide', onPageHide);
            // Leaving for another problem inside the app.
            flush(true);
        };
    }, [contestId, problemIndex, sheetId]);
}
