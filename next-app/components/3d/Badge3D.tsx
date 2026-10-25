'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Award } from 'lucide-react';
import { acquireTile, type Tile } from './badge-renderer';

// Draco decoder served from our own origin instead of Google's CDN.
export const DRACO_PATH = '/draco/';

interface Badge3DProps {
    modelPath: string;
    unlocked?: boolean;
    scale?: number;
    spin?: boolean;
    compact?: boolean;
    /** Turn freely in every direction under a finger. Only for places where the page does not scroll, such as the badge card. */
    free?: boolean;
    /** Picture shown instead of the scene when WebGL is unavailable or the model fails. */
    fallbackSrc?: string;
}

/**
 * Mount the 3D scene only once the badge is near the viewport, and pause its
 * render loop while it is off-screen. A page of badges used to start every
 * WebGL scene (and ~10 MB of models) at once, which froze weak laptops.
 */
function useNearViewport<T extends Element>() {
    const ref = useRef<T>(null);
    const [seen, setSeen] = useState(false);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const observer = new IntersectionObserver(([entry]) => {
            setVisible(entry.isIntersecting);
            if (entry.isIntersecting) setSeen(true);
        }, { rootMargin: '200px' });
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return { ref, seen, visible };
}

let webglOk = false;

/**
 * Success is cached; failure is not, so a context that was only briefly
 * unavailable (too many canvases, GPU process restarting) can recover on retry.
 * The probe context is released straight away so it does not eat into the
 * browser's small per-page limit.
 */
export function hasWebGL(): boolean {
    if (webglOk) return true;
    try {
        const canvas = document.createElement('canvas');
        const gl = (canvas.getContext('webgl2') || canvas.getContext('webgl')) as WebGLRenderingContext | null;
        if (!gl) return false;
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        webglOk = true;
    } catch {
        return false;
    }
    return webglOk;
}

const modelUrls = new Map<string, Promise<string>>();

/** Downloads a model while reporting 0-100 so the tile can show real progress. */
export function loadModel(path: string, onProgress: (pct: number | null) => void): Promise<string> {
    let pending = modelUrls.get(path);
    if (!pending) {
        pending = (async () => {
            const res = await fetch(path);
            if (!res.ok || !res.body) throw new Error(`Failed to load ${path}`);
            const total = Number(res.headers.get('content-length')) || 0;
            const reader = res.body.getReader();
            const chunks: Uint8Array[] = [];
            let received = 0;
            for (;;) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
                received += value.length;
                // A compressed response reports its encoded size, so never claim 100% early.
                onProgress(total ? Math.min(99, Math.round((received / total) * 100)) : null);
            }
            return URL.createObjectURL(new Blob(chunks as BlobPart[], { type: 'model/gltf-binary' }));
        })();
        pending.catch(() => modelUrls.delete(path));
        modelUrls.set(path, pending);
    }
    return pending;
}

function BadgeFallback({ onRetry, src, stock }: { onRetry?: () => void; src?: string; stock?: string }) {
    // A snapshot that fails to decode falls back to the stock picture, then to a plain icon.
    const [broken, setBroken] = useState(false);
    const shown = broken ? stock : src;
    return (
        <button type="button" onClick={onRetry} title="3D preview unavailable. Click to retry."
            className="absolute inset-0 flex items-center justify-center text-[#E8C15A]/70 cursor-pointer">
            {shown ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={shown} alt="" onError={() => setBroken(true)} className="h-full w-full object-contain p-2" />
            ) : <Award size={40} strokeWidth={1.5} />}
        </button>
    );
}

// Pointy-top hexagon outline in a 100x100 box, the same shape as the badges.
const HEX_POINTS = '50,6 88,28 88,72 50,94 12,72 12,28';
const HEX_LENGTH = 6 * 44;

/**
 * Loading state: the badge picture ghosted behind a hexagon that draws itself
 * as the model downloads, with the percentage in the middle. Without a known
 * size the outline just keeps turning.
 */
function LoadingBadge({ pct, src }: { pct: number | null; src?: string }) {
    const done = pct === null ? 0.25 : Math.max(0.04, pct / 100);
    return (
        <div className="absolute inset-0 flex items-center justify-center" role="progressbar"
            aria-valuenow={pct ?? undefined} aria-valuemin={0} aria-valuemax={100}>
            {src && <Image src={src} alt="" fill sizes="240px" className="object-contain p-5 opacity-25 blur-[1px] animate-[badgePulse_1.6s_ease-in-out_infinite]" />}
            <svg viewBox="0 0 100 100" className={`relative h-[62%] max-h-36 aspect-square ${pct === null ? 'animate-[badgeSpin_2.4s_linear_infinite]' : ''}`}>
                <polygon points={HEX_POINTS} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" strokeLinejoin="round" />
                <polygon points={HEX_POINTS} fill="none" stroke="#E8C15A" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"
                    strokeDasharray={HEX_LENGTH} strokeDashoffset={HEX_LENGTH * (1 - done)}
                    style={{ transition: 'stroke-dashoffset 300ms ease-out', filter: 'drop-shadow(0 0 3px rgba(232,193,90,0.6))' }} />
            </svg>
            <span className="absolute text-xs font-semibold text-[#E8C15A] tabular-nums">{pct === null ? '' : `${pct}%`}</span>
            <style>{`@keyframes badgePulse{0%,100%{opacity:.18}50%{opacity:.34}}@keyframes badgeSpin{to{transform:rotate(360deg)}}@keyframes badgeIn{from{opacity:0;transform:scale(.9)}to{opacity:1;transform:scale(1)}}`}</style>
        </div>
    );
}


export default function Badge3D({ modelPath, unlocked = true, scale = 2, spin = false, compact = false, free = false, fallbackSrc }: Badge3DProps) {
    const { ref, seen, visible } = useNearViewport<HTMLDivElement>();
    const [attempt, setAttempt] = useState(0);
    const [pct, setPct] = useState<number | null>(0);
    const [url, setUrl] = useState<string | null>(null);
    const [failed, setFailed] = useState(false);
    const [ready, setReady] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const tile = useRef<Tile | null>(null);

    useEffect(() => {
        if (!seen) return;
        let cancelled = false;
        loadModel(modelPath, p => { if (!cancelled) setPct(p); })
            .then(u => { if (!cancelled) setUrl(u); })
            .catch(() => { if (!cancelled) setFailed(true); });
        return () => { cancelled = true; };
    }, [seen, modelPath, attempt]);

    // Every badge draws through one shared WebGL renderer, so none is ever swapped for a picture.
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!url || !canvas) return;
        const t = acquireTile({ canvas, url, scale, spin, free, onReady: () => setReady(true), onError: () => setFailed(true) });
        tile.current = t;
        return () => { t.dispose(); tile.current = null; setReady(false); };
    }, [url, scale, spin, free]);

    useEffect(() => { tile.current?.setVisible(visible); }, [visible, ready]);

    const retry = () => { setFailed(false); setPct(0); setUrl(null); setAttempt(n => n + 1); };

    return (
        <div ref={ref} className={`w-full h-full ${compact ? '' : 'min-h-[160px]'} relative`}>
            {failed || (seen && !hasWebGL()) ? (
                <BadgeFallback onRetry={retry} src={fallbackSrc} />
            ) : !seen ? (
                <BadgeFallback src={fallbackSrc} />
            ) : (
                <>
                    {!ready && (url ? <BadgeFallback src={fallbackSrc} /> : <LoadingBadge pct={pct} src={fallbackSrc} />)}
                    {url && (
                        <canvas ref={canvasRef}
                            className={`absolute inset-0 h-full w-full ${free ? 'touch-none' : 'touch-pan-y'} cursor-grab active:cursor-grabbing transition-opacity duration-500 ${ready ? 'opacity-100' : 'opacity-0'} ${!unlocked ? 'grayscale !opacity-45' : ''}`} />
                    )}
                </>
            )}
        </div>
    );
}
