'use client';


import { Component, Suspense, useEffect, useRef, useMemo, useState, type ReactNode } from 'react';
import { Award } from 'lucide-react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, Environment, Lightformer, Float, OrbitControls, Center, Html } from '@react-three/drei';
import * as THREE from 'three';
import Loader from '@/components/common/Loader';

interface ModelProps {
    path: string;
    scale?: number;
    unlocked?: boolean;
    spin?: boolean;
}

function Model({ path, scale = 1, spin = false }: ModelProps) {
    const { scene } = useGLTF(path);
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
function hasWebGL(): boolean {
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
function loadModel(path: string, onProgress: (pct: number | null) => void): Promise<string> {
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

function BadgeFallback({ onRetry }: { onRetry?: () => void }) {
    return (
        <button type="button" onClick={onRetry} title="3D preview unavailable. Click to retry."
            className="absolute inset-0 flex items-center justify-center text-[#E8C15A]/70 cursor-pointer">
            <Award size={40} strokeWidth={1.5} />
        </button>
    );
}

function LoadingBadge({ pct }: { pct: number | null }) {
    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2" role="progressbar" aria-valuenow={pct ?? undefined} aria-valuemin={0} aria-valuemax={100}>
            <span className="text-sm font-medium text-[#E8C15A] tabular-nums">{pct === null ? '…' : `${pct}%`}</span>
            <span className="h-1 w-16 rounded-full bg-white/10 overflow-hidden">
                <span className="block h-full bg-[#E8C15A] transition-[width] duration-200" style={{ width: `${pct ?? 15}%` }} />
            </span>
        </div>
    );
}

/** If the scene still fails to start, show the static badge instead of erroring the page. */
class SceneBoundary extends Component<{ children: ReactNode; onRetry: () => void }, { failed: boolean }> {
    state = { failed: false };
    static getDerivedStateFromError() { return { failed: true }; }
    render() {
        return this.state.failed
            ? <BadgeFallback onRetry={() => { this.setState({ failed: false }); this.props.onRetry(); }} />
            : this.props.children;
    }
}

export default function Badge3D({ modelPath, unlocked = true, scale = 2, spin = false, compact = false }: Badge3DProps) {
    const { ref, seen, visible } = useNearViewport<HTMLDivElement>();
    const [attempt, setAttempt] = useState(0);
    const [pct, setPct] = useState<number | null>(0);
    const [url, setUrl] = useState<string | null>(null);
    const [failed, setFailed] = useState(false);

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
        <div ref={ref} className={`w-full h-full ${compact ? '' : 'min-h-[160px]'} relative ${!unlocked ? 'blur-sm grayscale opacity-60' : ''}`}>
            {!seen ? (
                <div className="absolute inset-0 flex items-center justify-center"><Loader /></div>
            ) : failed || !hasWebGL() ? (
                <BadgeFallback onRetry={retry} />
            ) : !url ? (
                <LoadingBadge pct={pct} />
            ) : (
            <SceneBoundary onRetry={retry}>
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
                    {/* Reflections from in-code light panels: the "city" preset downloaded
                        an HDR from an external CDN for every badge and failed when it was slow. */}
                    <Environment resolution={64}>
                        <Lightformer intensity={2} position={[0, 5, -9]} scale={[10, 10, 1]} />
                        <Lightformer intensity={1.5} position={[-5, 1, -1]} rotation-y={Math.PI / 2} scale={[50, 2, 1]} />
                        <Lightformer intensity={1.5} position={[5, 1, -1]} rotation-y={-Math.PI / 2} scale={[50, 2, 1]} />
                        <Lightformer intensity={1} position={[0, -5, 5]} rotation-x={Math.PI / 2} scale={[20, 20, 1]} />
                    </Environment>
                    <OrbitControls enableZoom={false} enablePan={false} minPolarAngle={Math.PI / 4} maxPolarAngle={Math.PI / 1.5} />
                </Suspense>
            </Canvas>
            </SceneBoundary>
            )}
        </div>
    );
}
