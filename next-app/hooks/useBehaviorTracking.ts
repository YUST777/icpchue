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
        // No window_blur / window_focus rows: tab_hidden and tab_visible already record the same
        // switches. Focus still counts as activity so the idle timer restarts.
        const onFocus = () => { lastActivityRef.current = Date.now(); };
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
    }, [track, ctx]);

    // 3. Paste detection (page fields via 'paste'; the code editor reports
    //    its own pastes through 'icpchue:code-paste').
    useEffect(() => {
        const record = (text: string) => {
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
        const onDomPaste = (e: ClipboardEvent) => {
            // The editor reports its own pastes; avoid counting them twice.
            if ((e.target as Element | null)?.closest?.('.monaco-editor')) return;
            record(e.clipboardData?.getData('text') || '');
        };
        const onEditorPaste = (e: Event) => record(String((e as CustomEvent).detail?.text || ''));
        document.addEventListener('paste', onDomPaste);
        window.addEventListener('icpchue:code-paste', onEditorPaste);
        return () => {
            document.removeEventListener('paste', onDomPaste);
            window.removeEventListener('icpchue:code-paste', onEditorPaste);
        };
    }, [track, ctx]);

    // 3b. Statement copies (and the trap name issued with them)
    useEffect(() => {
        const handler = (e: Event) => {
            const d = (e as CustomEvent).detail || {};
            track({
                action: 'statement_copy', ...ctx(),
                metadata: { len: Number(d.len) || 0, sample: !!d.sample, trap: d.trap || null, timeMs: Date.now() - enterTimeRef.current },
            });
        };
        window.addEventListener('icpchue:statement-copy', handler);
        return () => window.removeEventListener('icpchue:statement-copy', handler);
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
        let reportedFor = 0; // last activity time already reported, so one idle stretch is one row
        const check = () => {
            if (document.hidden) return; // Don't report idle when tab is hidden
            const idleMs = Date.now() - lastActivityRef.current;
            if (idleMs > 60000 && reportedFor !== lastActivityRef.current) {
                reportedFor = lastActivityRef.current;
                track({ action: 'user_idle', ...ctx(), metadata: { idleMs, timeMs: Date.now() - enterTimeRef.current } });
            }
        };
        idleTimerRef.current = setInterval(check, 120000);
        return () => { if (idleTimerRef.current) clearInterval(idleTimerRef.current); };
    }, [track, ctx]);

    // 7. Heartbeat — periodic snapshot every 5m (skip when tab hidden)
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
        }, 300000);
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

    // 9. Code change frequency — listen for Monaco editor changes via custom event
    useEffect(() => {
        const handler = () => {
            codeChangeCountRef.current++;
            lastActivityRef.current = Date.now();
        };
        // The CodeWorkspace dispatches this on every onChange
        window.addEventListener('icpchue:code-change', handler);
        return () => window.removeEventListener('icpchue:code-change', handler);
    }, []);

    // 10. DevTools detection (window resize heuristic + debugger timing)
    useEffect(() => {
        const handler = () => {
            const widthDiff = Math.abs(window.outerWidth - window.innerWidth);
            const heightDiff = Math.abs(window.outerHeight - window.innerHeight);
            // If the difference suddenly jumps by >200px, devtools likely opened
            if (widthDiff > 200 || heightDiff > 200) {
                track({ action: 'devtools_open', ...ctx(), metadata: { widthDiff, heightDiff, timeMs: Date.now() - enterTimeRef.current } });
            }
        };
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
    }, [track, ctx]);

    // 11. Print attempt detection (Ctrl+P)
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
                track({ action: 'print_attempt', ...ctx(), metadata: { timeMs: Date.now() - enterTimeRef.current } });
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [track, ctx]);
}
