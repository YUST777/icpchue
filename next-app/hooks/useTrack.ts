import { useCallback, useRef, useEffect, useMemo } from 'react';

interface TrackPayload {
    action: string;
    contestId?: string;
    problemId?: string;
    sheetId?: string;
    metadata?: Record<string, unknown>;
}

// Debounce map to prevent duplicate rapid-fire events
const lastSent = new Map<string, number>();
const DEBOUNCE_MS = 2000;

// Generate a unique session ID per browser tab (persists across navigations within the tab)
function getSessionId(): string {
    if (typeof window === 'undefined') return '';
    let sid = sessionStorage.getItem('icpchue-session-id');
    if (!sid) {
        sid = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        sessionStorage.setItem('icpchue-session-id', sid);
    }
    return sid;
}

export function useTrack() {
    const queueRef = useRef<TrackPayload[]>([]);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const sessionId = useMemo(() => getSessionId(), []);

    const flush = useCallback(() => {
        const batch = queueRef.current.splice(0);
        if (batch.length === 0) return;
        // Send each event individually (server buffers in Redis)
        for (const payload of batch) {
            fetch('/api/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...payload, sessionId }),
                keepalive: true,
            }).catch(() => {});
        }
    }, [sessionId]);

    const track = useCallback((payload: TrackPayload) => {
        // Debounce: skip if same action+context sent recently
        const key = `${payload.action}:${payload.contestId || ''}:${payload.problemId || ''}`;
        const now = Date.now();
        const last = lastSent.get(key);
        if (last && now - last < DEBOUNCE_MS) return;
        lastSent.set(key, now);

        queueRef.current.push(payload);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(flush, 500);
    }, [flush]);

    // Flush on page unload
    useEffect(() => {
        const handleUnload = () => flush();
        window.addEventListener('beforeunload', handleUnload);
        return () => window.removeEventListener('beforeunload', handleUnload);
    }, [flush]);

    return track;
}
