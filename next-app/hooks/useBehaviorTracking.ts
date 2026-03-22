import { useEffect, useRef, useCallback } from 'react';

/**
 * Comprehensive behavior tracking for cheating detection & user analytics.
 * Tracks: tab visibility, paste events, focus/blur, idle time, typing patterns,
 * time-on-problem, copy events, and window resize (screen sharing indicator).
 */
export function useBehaviorTracking({
    track,
    contestId,
    problemId,
    sheetId,
    editorRef,
}: {
    track: (payload: any) => void;
    contestId: string;
    problemId: string;
    sheetId?: string;
    editorRef?: React.MutableRefObject<any>;
}) {
    const enterTimeRef = useRef(Date.now());
    const lastActivityRef = useRef(Date.now());
    const keystrokeCountRef = useRef(0);
    const pasteCountRef = useRef(0);
    const tabSwitchCountRef = useRef(0);
    const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const ctx = useCallback(() => ({ contestId, problemId, sheetId }), [contestId, problemId, sheetId]);

    // Reset counters when problem changes
    useEffect(() => {
        enterTimeRef.current = Date.now();
        lastActivityRef.current = Date.now();
        keystrokeCountRef.current = 0;
        pasteCountRef.current = 0;
        tabSwitchCountRef.current = 0;
    }, [contestId, problemId]);

    // 1. Tab visibility tracking (browser tab switches — strong cheating signal)
    useEffect(() => {
        const handleVisibility = () => {
            const hidden = document.hidden;
            tabSwitchCountRef.current++;
            track({
                action: hidden ? 'tab_hidden' : 'tab_visible',
                ...ctx(),
                metadata: {
                    switchCount: tabSwitchCountRef.current,
                    timeOnProblemMs: Date.now() - enterTimeRef.current,
                },
            });
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, [track, ctx]);

    // 2. Window focus/blur (alt-tab, switching apps)
    useEffect(() => {
        const handleBlur = () => {
            track({ action: 'window_blur', ...ctx(), metadata: { timeOnProblemMs: Date.now() - enterTimeRef.current } });
        };
        const handleFocus = () => {
            track({ action: 'window_focus', ...ctx(), metadata: { timeOnProblemMs: Date.now() - enterTimeRef.current } });
            lastActivityRef.current = Date.now();
        };
        window.addEventListener('blur', handleBlur);
        window.addEventListener('focus', handleFocus);
        return () => { window.removeEventListener('blur', handleBlur); window.removeEventListener('focus', handleFocus); };
    }, [track, ctx]);

    // 3. Paste detection in editor (strong cheating signal)
    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            const text = e.clipboardData?.getData('text') || '';
            pasteCountRef.current++;
            track({
                action: 'code_paste',
                ...ctx(),
                metadata: {
                    pasteLength: text.length,
                    pasteLineCount: text.split('\n').length,
                    totalPastes: pasteCountRef.current,
                    timeOnProblemMs: Date.now() - enterTimeRef.current,
                    // Don't send actual pasted content for privacy — just metrics
                    hasCodeStructure: /\b(for|while|if|return|function|class|def|int|void)\b/.test(text),
                },
            });
        };
        document.addEventListener('paste', handlePaste);
        return () => document.removeEventListener('paste', handlePaste);
    }, [track, ctx]);

    // 4. Copy detection (might be copying problem text or their own code)
    useEffect(() => {
        const handleCopy = () => {
            track({ action: 'text_copy', ...ctx(), metadata: { timeOnProblemMs: Date.now() - enterTimeRef.current } });
        };
        document.addEventListener('copy', handleCopy);
        return () => document.removeEventListener('copy', handleCopy);
    }, [track, ctx]);

    // 5. Keystroke counting (typing speed / pattern analysis)
    useEffect(() => {
        const handleKeydown = (e: KeyboardEvent) => {
            // Only count actual typing keys, not modifiers
            if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.length === 1) {
                keystrokeCountRef.current++;
                lastActivityRef.current = Date.now();
            }
        };
        document.addEventListener('keydown', handleKeydown);
        return () => document.removeEventListener('keydown', handleKeydown);
    }, []);

    // 6. Idle detection (>60s no activity = idle)
    useEffect(() => {
        const checkIdle = () => {
            const idleMs = Date.now() - lastActivityRef.current;
            if (idleMs > 60000) {
                track({ action: 'user_idle', ...ctx(), metadata: { idleMs, timeOnProblemMs: Date.now() - enterTimeRef.current } });
            }
        };
        idleTimerRef.current = setInterval(checkIdle, 30000);
        return () => { if (idleTimerRef.current) clearInterval(idleTimerRef.current); };
    }, [track, ctx]);

    // 7. Heartbeat — periodic activity snapshot every 60s
    useEffect(() => {
        heartbeatRef.current = setInterval(() => {
            track({
                action: 'heartbeat',
                ...ctx(),
                metadata: {
                    timeOnProblemMs: Date.now() - enterTimeRef.current,
                    keystrokeCount: keystrokeCountRef.current,
                    pasteCount: pasteCountRef.current,
                    tabSwitchCount: tabSwitchCountRef.current,
                },
            });
        }, 60000);
        return () => { if (heartbeatRef.current) clearInterval(heartbeatRef.current); };
    }, [track, ctx]);

    // 8. Track time-on-problem when leaving (unmount or problem change)
    useEffect(() => {
        return () => {
            const totalMs = Date.now() - enterTimeRef.current;
            // Use navigator.sendBeacon for reliability on unmount
            const payload = JSON.stringify({
                action: 'problem_leave',
                contestId,
                problemId,
                sheetId,
                metadata: {
                    totalTimeMs: totalMs,
                    keystrokeCount: keystrokeCountRef.current,
                    pasteCount: pasteCountRef.current,
                    tabSwitchCount: tabSwitchCountRef.current,
                },
            });
            try {
                navigator.sendBeacon('/api/track', payload);
            } catch {
                // Fallback
                fetch('/api/track', { method: 'POST', body: payload, keepalive: true, headers: { 'Content-Type': 'application/json' } }).catch(() => {});
            }
        };
    }, [contestId, problemId, sheetId]);

    // 9. Right-click detection (context menu — might indicate copy attempts)
    useEffect(() => {
        const handleContextMenu = () => {
            track({ action: 'context_menu', ...ctx(), metadata: { timeOnProblemMs: Date.now() - enterTimeRef.current } });
        };
        document.addEventListener('contextmenu', handleContextMenu);
        return () => document.removeEventListener('contextmenu', handleContextMenu);
    }, [track, ctx]);
}
