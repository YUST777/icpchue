'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

/**
 * Tracks how a trainee consumes a recorded session and reports it to
 * /api/track/session-watch (shown to mentors on the trainee page):
 * page time and video watch time (both only while the tab is visible),
 * the 10-second parts of the video that played, the furthest point reached,
 * play count, and which slides were opened.
 */

const ENDPOINT = '/api/track/session-watch';
const FLUSH_MS = 60_000;
const BUCKET_SECONDS = 10;

interface Pending {
    watched: number;
    pageSeconds: number;
    plays: number;
    buckets: Set<number>;
    slides: Set<number>;
    position: number;
    duration: number;
}

interface PlayerHandle {
    getCurrentTime(): number;
    getDuration(): number;
    getPlayerState(): number;
    destroy(): void;
}

interface SessionWatchApi {
    slideSeen(slide: number): void;
    registerPlayer(player: PlayerHandle | null): void;
    countPlay(): void;
}

const SessionWatchContext = createContext<SessionWatchApi | null>(null);

/** Optional: components outside a session page simply get null. */
export function useSessionWatch() {
    return useContext(SessionWatchContext);
}

const emptyPending = (): Pending => ({ watched: 0, pageSeconds: 0, plays: 0, buckets: new Set(), slides: new Set(), position: 0, duration: 0 });

export function SessionWatchProvider({ campSlug, sessionSlug, videoId, children }: {
    campSlug: string;
    sessionSlug: string;
    videoId?: string;
    children: ReactNode;
}) {
    const pending = useRef<Pending>(emptyPending());
    const player = useRef<PlayerHandle | null>(null);

    const flush = useCallback((useBeacon: boolean) => {
        const p = pending.current;
        if (!p.watched && !p.pageSeconds && !p.plays && !p.buckets.size && !p.slides.size) return;
        pending.current = { ...emptyPending(), position: p.position, duration: p.duration };
        const body = JSON.stringify({
            campSlug, sessionSlug, videoId: videoId || null,
            watched: p.watched, pageSeconds: p.pageSeconds, plays: p.plays,
            buckets: [...p.buckets], slides: [...p.slides],
            position: Math.floor(p.position), duration: Math.floor(p.duration),
        });
        if (useBeacon && navigator.sendBeacon?.(ENDPOINT, new Blob([body], { type: 'text/plain' }))) return;
        fetch(ENDPOINT, { method: 'POST', body, keepalive: true, credentials: 'include' }).catch(() => {});
    }, [campSlug, sessionSlug, videoId]);

    useEffect(() => {
        // One tick per second; nothing counts while the tab is hidden.
        const tick = setInterval(() => {
            if (document.hidden) return;
            const p = pending.current;
            p.pageSeconds += 1;
            const yt = player.current;
            if (!yt) return;
            try {
                const duration = yt.getDuration();
                if (duration > 0) p.duration = duration;
                if (yt.getPlayerState() === 1) { // YT.PlayerState.PLAYING
                    const t = yt.getCurrentTime();
                    p.watched += 1;
                    p.position = Math.max(p.position, t);
                    p.buckets.add(Math.floor(t / BUCKET_SECONDS));
                }
            } catch {
                // Player not ready yet.
            }
        }, 1000);
        const flusher = setInterval(() => flush(false), FLUSH_MS);
        const onVisibility = () => { if (document.hidden) flush(true); };
        const onPageHide = () => flush(true);
        document.addEventListener('visibilitychange', onVisibility);
        window.addEventListener('pagehide', onPageHide);
        return () => {
            clearInterval(tick);
            clearInterval(flusher);
            document.removeEventListener('visibilitychange', onVisibility);
            window.removeEventListener('pagehide', onPageHide);
            flush(true);
        };
    }, [flush]);

    const api = useMemo<SessionWatchApi>(() => ({
        slideSeen: (slide) => { pending.current.slides.add(slide); },
        registerPlayer: (p) => { player.current = p; },
        countPlay: () => { pending.current.plays += 1; },
    }), []);

    return <SessionWatchContext.Provider value={api}>{children}</SessionWatchContext.Provider>;
}

// ── YouTube player (official IFrame API) ────────────────────────────────

interface YTNamespace {
    Player: new (el: HTMLElement, opts: Record<string, unknown>) => PlayerHandle;
}
declare global {
    interface Window { YT?: YTNamespace; onYouTubeIframeAPIReady?: () => void }
}

let ytApiPromise: Promise<YTNamespace> | null = null;
function loadYouTubeApi(): Promise<YTNamespace> {
    if (window.YT?.Player) return Promise.resolve(window.YT);
    if (!ytApiPromise) {
        ytApiPromise = new Promise((resolve, reject) => {
            const previous = window.onYouTubeIframeAPIReady;
            window.onYouTubeIframeAPIReady = () => { previous?.(); if (window.YT) resolve(window.YT); };
            const script = document.createElement('script');
            script.src = 'https://www.youtube.com/iframe_api';
            script.async = true;
            script.onerror = () => { ytApiPromise = null; reject(new Error('YouTube API failed to load')); };
            document.head.appendChild(script);
        });
    }
    return ytApiPromise;
}

/** YouTube embed that reports watch time to the surrounding SessionWatchProvider. */
export function TrackedYouTube({ videoId, title, fallbackSrc }: { videoId: string; title: string; fallbackSrc: string }) {
    const host = useRef<HTMLDivElement>(null);
    const [apiFailed, setApiFailed] = useState(false);
    const watch = useSessionWatch();

    useEffect(() => {
        let destroyed = false;
        let created: PlayerHandle | null = null;
        // A "play" is the first PLAYING after unstarted (-1), ended (0) or cued (5),
        // even through buffering (3); resuming a pause does not count again.
        let started = false;
        loadYouTubeApi().then((YT) => {
            if (destroyed || !host.current) return;
            created = new YT.Player(host.current, {
                videoId,
                host: 'https://www.youtube-nocookie.com',
                width: '100%',
                height: '100%',
                playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
                events: {
                    onReady: () => watch?.registerPlayer(created),
                    onStateChange: (e: { data: number }) => {
                        if (e.data === -1 || e.data === 0 || e.data === 5) started = false;
                        else if (e.data === 1 && !started) { started = true; watch?.countPlay(); }
                    },
                },
            });
        }).catch(() => {
            // API blocked (extension or network): show the plain embed instead.
            if (!destroyed) setApiFailed(true);
        });
        return () => {
            destroyed = true;
            watch?.registerPlayer(null);
            try { created?.destroy(); } catch { /* already gone */ }
        };
    }, [videoId, watch]);

    return (
        <div className="relative w-full h-full">
            <div ref={host} className="absolute inset-0 [&>iframe]:w-full [&>iframe]:h-full" />
            {apiFailed && (
                <iframe src={fallbackSrc} title={title} allow="autoplay; fullscreen" allowFullScreen className="absolute inset-0 w-full h-full" />
            )}
        </div>
    );
}
