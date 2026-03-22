import { useCallback, useRef } from 'react';

interface TrackPayload {
    action: string;
    contestId?: string;
    problemId?: string;
    sheetId?: string;
    metadata?: Record<string, unknown>;
}

// Debounce map to prevent duplicate rapid-fire events
const lastSent = new Map<string, number>();
const DEBOUNCE_MS = 2000; // 2s debounce for same action+context

export function useTrack() {
    const queueRef = useRef<TrackPayload[]>([]);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const flush = useCallback(() => {
        const batch = queueRef.current.splice(0);
        if (batch.length === 0) return;
        // Send each event (could batch later if needed)
        for (const payload of batch) {
            fetch('/api/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                keepalive: true, // survives page unload
            }).catch(() => {});
        }
    }, []);

    const track = useCallback((payload: TrackPayload) => {
        // Debounce: skip if same action+context sent recently
        const key = `${payload.action}:${payload.contestId || ''}:${payload.problemId || ''}`;
        const now = Date.now();
        const last = lastSent.get(key);
        if (last && now - last < DEBOUNCE_MS) return;
        lastSent.set(key, now);

        queueRef.current.push(payload);

        // Micro-batch: flush after 500ms idle
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(flush, 500);
    }, [flush]);

    return track;
}
