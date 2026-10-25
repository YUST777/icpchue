'use client';


import { Component, Suspense, useEffect, useRef, useMemo, useState, type ReactNode } from 'react';
import Image from 'next/image';
import { Award } from 'lucide-react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, Environment, Float, OrbitControls, Center, Html } from '@react-three/drei';
import * as THREE from 'three';
import Loader from '@/components/common/Loader';

// Draco decoder served from our own origin instead of Google's CDN.
export const DRACO_PATH = '/draco/';

interface ModelProps {
    path: string;
    scale?: number;
    unlocked?: boolean;
    spin?: boolean;
}

export function Model({ path, scale = 1, spin = false }: ModelProps) {
    const { scene } = useGLTF(path, DRACO_PATH);
    // Clone scene to avoid mutating the shared cache
    const clone = useMemo(() => scene.clone(), [scene]);
    const ref = useRef<THREE.Group>(null);

    useFrame((state, delta) => {
        if (!ref.current) return;
        // Badges with a designed back turn all the way round; the rest sway.
        if (spin) ref.current.rotation.y += delta * 0.7;
        else ref.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
    });

    return (
        <group ref={ref}>
            <primitive object={clone} scale={scale} />
        </group>
    );
}

interface Badge3DProps {
    modelPath: string;
    unlocked?: boolean;
    scale?: number;
    spin?: boolean;
    compact?: boolean;
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

function BadgeFallback({ onRetry, src }: { onRetry?: () => void; src?: string }) {
    return (
        <button type="button" onClick={onRetry} title="3D preview unavailable. Click to retry."
            className="absolute inset-0 flex items-center justify-center text-[#E8C15A]/70 cursor-pointer">
            {src ? <Image src={src} alt="" fill sizes="320px" className="object-contain p-2" /> : <Award size={40} strokeWidth={1.5} />}
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

/** If the scene still fails to start, show the static badge instead of erroring the page. */
class SceneBoundary extends Component<{ children: ReactNode; onRetry: () => void; fallbackSrc?: string }, { failed: boolean }> {
    state = { failed: false };
    static getDerivedStateFromError() { return { failed: true }; }
    render() {
        return this.state.failed
            ? <BadgeFallback src={this.props.fallbackSrc} onRetry={() => { this.setState({ failed: false }); this.props.onRetry(); }} />
            : this.props.children;
    }
}

/** Chrome allows ~16 WebGL contexts per page. Allow up to 16 live 3D badges on screen simultaneously. */
const MAX_LIVE_SCENES = 12;

interface SceneEntry { visible: boolean; lastSeen: number; evict: () => void }
const liveScenes = new Map<symbol, SceneEntry>();

/**
 * Scenes stay mounted (paused) after they scroll off screen, so scrolling back is
 * instant. Only when more than MAX_LIVE_SCENES want to exist is the one that left
 * the screen longest ago released.
 */
function claimScene(id: symbol, entry: SceneEntry): boolean {
    if (liveScenes.has(id)) return true;
    if (liveScenes.size >= MAX_LIVE_SCENES) {
        let oldest: [symbol, SceneEntry] | null = null;
        for (const item of liveScenes) {
            if (!item[1].visible && (!oldest || item[1].lastSeen < oldest[1].lastSeen)) oldest = item;
        }
        if (!oldest) return false;
        liveScenes.delete(oldest[0]);
        oldest[1].evict();
    }
    liveScenes.set(id, entry);
    return true;
}

export default function Badge3D({ modelPath, unlocked = true, scale = 2, spin = false, compact = false, fallbackSrc }: Badge3DProps) {
    const { ref, seen, visible } = useNearViewport<HTMLDivElement>();
    const [attempt, setAttempt] = useState(0);
    const [pct, setPct] = useState<number | null>(0);
    const [url, setUrl] = useState<string | null>(null);
    const [failed, setFailed] = useState(false);
    const [granted, setGranted] = useState(false);
    const [introDone, setIntroDone] = useState(false);
    const id = useRef(Symbol('badge-scene'));
    const entry = useRef<SceneEntry>({ visible: false, lastSeen: 0, evict: () => setGranted(false) });

    // Claim a scene slot when the badge is on screen with its model loaded; keep it afterwards.
    useEffect(() => {
        entry.current.visible = visible;
        if (visible) entry.current.lastSeen = Date.now();
        if (visible && url && claimScene(id.current, entry.current)) setGranted(true);
    }, [visible, url]);

    useEffect(() => {
        const mine = id.current;
        return () => { liveScenes.delete(mine); };
    }, []);

    // The fade-in plays once, not every time the badge scrolls back into view.
    useEffect(() => {
        if (!granted) return;
        const t = setTimeout(() => setIntroDone(true), 700);
        return () => clearTimeout(t);
    }, [granted]);

    useEffect(() => {
        if (!seen) return;
        let cancelled = false;
        loadModel(modelPath, p => { if (!cancelled) setPct(p); })
            .then(u => { if (!cancelled) setUrl(u); })
            .catch(() => { if (!cancelled) setFailed(true); });
        return () => { cancelled = true; };
    }, [seen, modelPath, attempt]);

    const retry = () => { setFailed(false); setPct(0); setAttempt(n => n + 1); };

    return (
        <div ref={ref} className={`w-full h-full ${compact ? '' : 'min-h-[160px]'} relative`}>
            {failed || (seen && !hasWebGL()) ? (
                <BadgeFallback onRetry={retry} src={fallbackSrc} />
            ) : !seen ? (
                <BadgeFallback src={fallbackSrc} />
            ) : !url ? (
                <LoadingBadge pct={pct} src={fallbackSrc} />
            ) : !granted ? (
                <BadgeFallback onRetry={retry} src={fallbackSrc} />
            ) : (
            <SceneBoundary onRetry={retry} fallbackSrc={fallbackSrc}>
            <div className={`absolute inset-0 ${introDone ? '' : 'animate-[badgeIn_0.6s_ease-out]'} ${!unlocked ? 'grayscale opacity-45' : ''}`}>
            <Canvas camera={{ position: [0, 0, 5], fov: 45 }} dpr={[1, 1.5]} frameloop={visible ? 'always' : 'never'}>
                <ambientLight intensity={1.5} />
                <spotLight position={[10, 10, 10]} angle={0.25} penumbra={1} intensity={2} />
                <pointLight position={[-10, -10, -10]} intensity={1} />

                <Suspense fallback={
                    <Html center>
                        <Loader />
                    </Html>
                }>
                    <Float
                        speed={2}
                        rotationIntensity={0.5}
                        floatIntensity={0.5}
                        floatingRange={[-0.1, 0.1]}
                    >
                        <Center>
                            <Model path={url} scale={scale * 1.45} unlocked={unlocked} spin={spin} />
                        </Center>
                    </Float>
                    <Environment files="/hdr/potsdamer_platz_1k.hdr" />
                    <OrbitControls enableZoom={false} enablePan={false} minPolarAngle={Math.PI / 4} maxPolarAngle={Math.PI / 1.5} />
                </Suspense>
            </Canvas>
            </div>
            </SceneBoundary>
            )}
        </div>
    );
}
