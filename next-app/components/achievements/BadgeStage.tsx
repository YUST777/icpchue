'use client';

import { Component, Suspense, createContext, useContext, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import Image from 'next/image';
import { Canvas } from '@react-three/fiber';
import { Environment, Lightformer, Float, OrbitControls, Center, PerspectiveCamera, View } from '@react-three/drei';
import { Model, hasWebGL, loadModel } from '@/components/3d/Badge3D';

/**
 * One WebGL canvas serves every badge on the page. Each tile reserves a <View>
 * rectangle and the shared canvas draws into it, so sixteen badges cost one
 * graphics context instead of sixteen (browsers allow about sixteen in total).
 * Every tile keeps its picture underneath, so a browser without WebGL still
 * shows the badges, and the live model fades in on top once it has downloaded.
 */

const StageContext = createContext<RefObject<HTMLDivElement | null> | null>(null);

class CanvasBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
    state = { failed: false };
    static getDerivedStateFromError() { return { failed: true }; }
    render() { return this.state.failed ? null : this.props.children; }
}

export function BadgeStage({ children, className }: { children: ReactNode; className?: string }) {
    const ref = useRef<HTMLDivElement>(null);
    const [webgl, setWebgl] = useState(false);

    useEffect(() => { setWebgl(hasWebGL()); }, []);

    return (
        <StageContext.Provider value={ref}>
            <div ref={ref} className={className}>
                {children}
                {webgl && (
                    <CanvasBoundary>
                        <Canvas
                            eventSource={ref as RefObject<HTMLElement>}
                            dpr={[1, 1.5]}
                            style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 5 }}
                        >
                            <View.Port />
                        </Canvas>
                    </CanvasBoundary>
                )}
            </div>
        </StageContext.Provider>
    );
}

/** A badge tile: picture first, percentage while downloading, live model when ready. */
export function BadgeTile({ modelPath, imageSrc, spin = false, live = true }: {
    modelPath: string;
    imageSrc: string;
    spin?: boolean;
    /** Locked badges stay as pictures. */
    live?: boolean;
}) {
    const stage = useContext(StageContext);
    const [pct, setPct] = useState<number | null>(0);
    const [url, setUrl] = useState<string | null>(null);
    const [shown, setShown] = useState(false);
    const [webgl, setWebgl] = useState(false);

    useEffect(() => { setWebgl(hasWebGL()); }, []);

    useEffect(() => {
        if (!live || !webgl) return;
        let cancelled = false;
        loadModel(modelPath, p => { if (!cancelled) setPct(p); })
            .then(u => { if (!cancelled) setUrl(u); })
            .catch(() => { /* the picture stays */ });
        return () => { cancelled = true; };
    }, [live, webgl, modelPath]);

    const loading = live && webgl && !shown;

    return (
        <div className="relative w-full h-full">
            <Image src={imageSrc} alt="" fill sizes="160px"
                className={`object-contain transition-opacity duration-500 ${shown ? 'opacity-0' : live ? '' : 'grayscale opacity-30'}`} />
            {loading && (
                <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-1" role="progressbar"
                    aria-valuenow={pct ?? undefined} aria-valuemin={0} aria-valuemax={100}>
                    <span className="text-[10px] font-medium text-[#E8C15A] tabular-nums">{url ? 'Preparing…' : pct === null ? '…' : `${pct}%`}</span>
                    <span className="h-0.5 w-12 rounded-full bg-white/10 overflow-hidden">
                        <span className="block h-full bg-[#E8C15A] transition-[width] duration-200" style={{ width: `${url ? 100 : (pct ?? 15)}%` }} />
                    </span>
                </div>
            )}
            {stage && url && (
                <View className="absolute inset-0">
                    <PerspectiveCamera makeDefault position={[0, 0, 5]} fov={45} />
                    <ambientLight intensity={1.5} />
                    <spotLight position={[10, 10, 10]} angle={0.25} penumbra={1} intensity={2} />
                    <pointLight position={[-10, -10, -10]} intensity={1} />
                    <Suspense fallback={null}>
                        <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5} floatingRange={[-0.1, 0.1]}>
                            <Center onCentered={() => setShown(true)}>
                                <Model path={url} scale={1.4 * 1.45} unlocked spin={spin} />
                            </Center>
                        </Float>
                        <Environment resolution={64}>
                            <Lightformer intensity={2} position={[0, 5, -9]} scale={[10, 10, 1]} />
                            <Lightformer intensity={1.5} position={[-5, 1, -1]} rotation-y={Math.PI / 2} scale={[50, 2, 1]} />
                            <Lightformer intensity={1.5} position={[5, 1, -1]} rotation-y={-Math.PI / 2} scale={[50, 2, 1]} />
                            <Lightformer intensity={1} position={[0, -5, 5]} rotation-x={Math.PI / 2} scale={[20, 20, 1]} />
                        </Environment>
                        <OrbitControls enableZoom={false} enablePan={false} minPolarAngle={Math.PI / 4} maxPolarAngle={Math.PI / 1.5} />
                    </Suspense>
                </View>
            )}
        </div>
    );
}
