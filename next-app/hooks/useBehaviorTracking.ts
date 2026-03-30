import { useEffect, useRef, useCallback } from 'react';

/**
 * Comprehensive behavior tracking for cheating detection & user analytics.
 * 
 * Tracks:
 * - Tab visibility (tab_hidden/tab_visible) — strong cheating signal
 * - Window focus/blur — alt-tab detection
 * - Paste events with metrics — strong cheating signal
 * - Copy events — might be copying solutions
 * - Keystroke counting — typing speed analysis
 * - Idle detection — >60s no activity
 * - Heartbeat — periodic snapshot every 60s
 * - Time-on-problem — total time when leaving
 * - Context menu — right-click detection
 * - Scroll depth — how far they read the problem
 * - Code change frequency — how often code changes (burst vs steady)
 * - DevTools detection — opening browser dev tools
 * - Print/screenshot attempt — Ctrl+P detection
 * - Window resize — screen sharing indicator
 * - Mouse idle zones — where the mouse rests (problem vs editor)
 */
export function useBehaviorTracking({
    track,
    contestId,
    problemId,
    sheetId,
}: {
    track: (payload: any) => void;
    contestId: string;
    problemId: string;
    sheetId?: string;
}) {
    const enterTimeRef = useRef(Date.now());
    const lastActivityRef = useRef(Date.now());
    const keystrokeCountRef = useRef(0);
    const pasteCountRef = useRef(0);
    const tabSwitchCountRef = useRef(0);
    const codeChangeCountRef = useRef(0);
    const maxScrollDepthRef = useRef(0);
    const idleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const ctx = useCallback(() => ({ contestId, problemId, sheetId }), [contestId, problemId, sheetId]);

    // Reset counters when problem changes
    useEffect(() => {
        enterTimeRef.current = Date.now();
        lastActivityRef.current = Date.now();
        keystrokeCountRef.current = 0;
        pasteCountRef.current = 0;
        tabSwitchCountRef.current = 0;
        codeChangeCountRef.current = 0;
        maxScrollDepthRef.current = 0;
    }, [contestId, problemId]);

    // 1. Tab visibility (browser tab switches)
    useEffect(() => {
        const handler = () => {
            tabSwitchCountRef.current++;
            track({
                action: document.hidden ? 'tab_hidden' : 'tab_visible',
                ...ctx(),
                metadata: { switchCount: tabSwitchCountRef.current, timeOnProblemMs: Date.now() - enterTimeRef.current },
            });
        };
        document.addEventListener('visibilitychange', handler);
        return () => document.removeEventListener('visibilitychange', handler);
    }, [track, ctx]);

    // 2. Window focus/blur
    useEffect(() => {
        const onBlur = () => track({ action: 'window_blur', ...ctx(), metadata: { timeMs: Date.now() - enterTimeRef.current } });
        const onFocus = () => { track({ action: 'window_focus', ...ctx(), metadata: { timeMs: Date.now() - enterTimeRef.current } }); lastActivityRef.current = Date.now(); };
        window.addEventListener('blur', onBlur);
        window.addEventListener('focus', onFocus);
        return () => { window.removeEventListener('blur', onBlur); window.removeEventListener('focus', onFocus); };
    }, [track, ctx]);

    // 3. Paste detection
    useEffect(() => {
        const handler = (e: ClipboardEvent) => {
            const text = e.clipboardData?.getData('text') || '';
            pasteCountRef.current++;
            track({
                action: 'code_paste', ...ctx(),
                metadata: {
                    len: text.length,
                    lines: text.split('\n').length,
                    totalPastes: pasteCountRef.current,
                    timeMs: Date.now() - enterTimeRef.current,
                    hasCode: /\b(for|while|if|return|function|class|def|int|void|#include|import)\b/.test(text),
                },
            });
        };
        document.addEventListener('paste', handler);
        return () => document.removeEventListener('paste', handler);
    }, [track, ctx]);

    // 4. Copy detection
    useEffect(() => {
        const handler = () => {
            const sel = window.getSelection()?.toString() || '';
            track({ action: 'text_copy', ...ctx(), metadata: { len: sel.length, timeMs: Date.now() - enterTimeRef.current } });
        };
        document.addEventListener('copy', handler);
        return () => document.removeEventListener('copy', handler);
    }, [track, ctx]);

    // 5. Keystroke counting
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.length === 1) {
                keystrokeCountRef.current++;
                lastActivityRef.current = Date.now();
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, []);

    // 6. Idle detection (>60s) — skip when tab is hidden
    useEffect(() => {
        const check = () => {
            if (document.hidden) return; // Don't report idle when tab is hidden
            const idleMs = Date.now() - lastActivityRef.current;
            if (idleMs > 60000) {
                track({ action: 'user_idle', ...ctx(), metadata: { idleMs, timeMs: Date.now() - enterTimeRef.current } });
            }
        };
        idleTimerRef.current = setInterval(check, 30000);
        return () => { if (idleTimerRef.current) clearInterval(idleTimerRef.current); };
    }, [track, ctx]);

    // 7. Heartbeat — periodic snapshot every 60s (skip when tab hidden)
    useEffect(() => {
        heartbeatRef.current = setInterval(() => {
            if (document.hidden) return;
            track({
                action: 'heartbeat', ...ctx(),
                metadata: {
                    timeMs: Date.now() - enterTimeRef.current,
                    keystrokes: keystrokeCountRef.current,
                    pastes: pasteCountRef.current,
                    tabSwitches: tabSwitchCountRef.current,
                    codeChanges: codeChangeCountRef.current,
                    scrollDepth: maxScrollDepthRef.current,
                },
            });
        }, 60000);
        return () => { if (heartbeatRef.current) clearInterval(heartbeatRef.current); };
    }, [track, ctx]);

    // 8. Problem leave (unmount) — sendBeacon for reliability
    useEffect(() => {
        return () => {
            const payload = JSON.stringify({
                action: 'problem_leave', contestId, problemId, sheetId,
                sessionId: typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('icpchue-session-id') || '' : '',
                metadata: {
                    totalTimeMs: Date.now() - enterTimeRef.current,
                    keystrokes: keystrokeCountRef.current,
                    pastes: pasteCountRef.current,
                    tabSwitches: tabSwitchCountRef.current,
                    codeChanges: codeChangeCountRef.current,
                    scrollDepth: maxScrollDepthRef.current,
                },
            });
            try { navigator.sendBeacon('/api/track', payload); } catch {
                fetch('/api/track', { method: 'POST', body: payload, keepalive: true, headers: { 'Content-Type': 'application/json' } }).catch(() => {});
            }
        };
    }, [contestId, problemId, sheetId]);

    // 9. Context menu (right-click)
    useEffect(() => {
        const handler = () => track({ action: 'context_menu', ...ctx(), metadata: { timeMs: Date.now() - enterTimeRef.current } });
        document.addEventListener('contextmenu', handler);
        return () => document.removeEventListener('contextmenu', handler);
    }, [track, ctx]);

    // 10. Scroll depth tracking on the problem description panel
    useEffect(() => {
        const panel = document.querySelector('.problem-panel .custom-scrollbar');
        if (!panel) return;
        let lastReported = 0;
        const handler = () => {
            const el = panel as HTMLElement;
            const depth = Math.round((el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100) || 0;
            if (depth > maxScrollDepthRef.current) maxScrollDepthRef.current = depth;
            // Report at 25% increments
            const bucket = Math.floor(depth / 25) * 25;
            if (bucket > lastReported) {
                lastReported = bucket;
                track({ action: 'scroll_depth', ...ctx(), metadata: { depth: bucket, timeMs: Date.now() - enterTimeRef.current } });
            }
        };
        panel.addEventListener('scroll', handler, { passive: true });
        return () => panel.removeEventListener('scroll', handler);
    }, [track, ctx]);

    // 11. Code change frequency — listen for Monaco editor changes via custom event
    useEffect(() => {
        const handler = () => {
            codeChangeCountRef.current++;
            lastActivityRef.current = Date.now();
        };
        // The CodeWorkspace dispatches this on every onChange
        window.addEventListener('icpchue:code-change', handler);
        return () => window.removeEventListener('icpchue:code-change', handler);
    }, []);

    // 12. DevTools detection (window resize heuristic + debugger timing)
    useEffect(() => {
        let lastWidth = window.outerWidth;
        let lastHeight = window.outerHeight;
        const handler = () => {
            const widthDiff = Math.abs(window.outerWidth - window.innerWidth);
            const heightDiff = Math.abs(window.outerHeight - window.innerHeight);
            // If the difference suddenly jumps by >200px, devtools likely opened
            if (widthDiff > 200 || heightDiff > 200) {
                track({ action: 'devtools_open', ...ctx(), metadata: { widthDiff, heightDiff, timeMs: Date.now() - enterTimeRef.current } });
            }
            // Also track significant window resizes (screen sharing indicator)
            const wChange = Math.abs(window.outerWidth - lastWidth);
            const hChange = Math.abs(window.outerHeight - lastHeight);
            if (wChange > 100 || hChange > 100) {
                track({ action: 'resize_window', ...ctx(), metadata: { w: window.innerWidth, h: window.innerHeight, timeMs: Date.now() - enterTimeRef.current } });
            }
            lastWidth = window.outerWidth;
            lastHeight = window.outerHeight;
        };
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
    }, [track, ctx]);

    // 13. Print attempt detection (Ctrl+P)
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
                track({ action: 'print_attempt', ...ctx(), metadata: { timeMs: Date.now() - enterTimeRef.current } });
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [track, ctx]);

    // 14. Mouse idle zone tracking — which panel the mouse spends time in
    useEffect(() => {
        let currentZone = '';
        let zoneEnterTime = 0;
        const handler = (e: MouseEvent) => {
            lastActivityRef.current = Date.now();
            const target = e.target as HTMLElement;
            let zone = 'other';
            if (target.closest('.problem-panel')) zone = 'problem';
            else if (target.closest('#onboarding-code-workspace')) zone = 'editor';
            else if (target.closest('#onboarding-test-panel')) zone = 'testpanel';

            if (zone !== currentZone) {
                // Report time spent in previous zone (only if >5s)
                if (currentZone && zoneEnterTime) {
                    const spent = Date.now() - zoneEnterTime;
                    if (spent > 5000) {
                        track({ action: 'mouse_idle_zone', ...ctx(), metadata: { zone: currentZone, spentMs: spent } });
                    }
                }
                currentZone = zone;
                zoneEnterTime = Date.now();
            }
        };
        // Throttle to every 2s
        let throttleTimer: ReturnType<typeof setTimeout> | null = null;
        const throttled = (e: MouseEvent) => {
            if (throttleTimer) return;
            throttleTimer = setTimeout(() => { throttleTimer = null; }, 2000);
            handler(e);
        };
        document.addEventListener('mousemove', throttled, { passive: true });
        return () => document.removeEventListener('mousemove', throttled);
    }, [track, ctx]);
}
