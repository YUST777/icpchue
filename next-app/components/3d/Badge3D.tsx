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

let webglSupport: boolean | null = null;

/** One probe per page load: browsers with hardware acceleration off cannot create a context at all. */
function hasWebGL(): boolean {
    if (webglSupport !== null) return webglSupport;
    try {
        const canvas = document.createElement('canvas');
        webglSupport = Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
    } catch {
        webglSupport = false;
    }
    return webglSupport;
}

function BadgeFallback() {
    return (
        <div className="absolute inset-0 flex items-center justify-center text-[#E8C15A]/70">
            <Award size={40} strokeWidth={1.5} />
        </div>
    );
}

/** If the scene still fails to start, show the static badge instead of erroring the page. */
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
    state = { failed: false };
    static getDerivedStateFromError() { return { failed: true }; }
    componentDidCatch() { webglSupport = false; }
    render() { return this.state.failed ? <BadgeFallback /> : this.props.children; }
}

export default function Badge3D({ modelPath, unlocked = true, scale = 2, spin = false }: Badge3DProps) {
    const { ref, seen, visible } = useNearViewport<HTMLDivElement>();

    return (
        <div ref={ref} className={`w-full h-full min-h-[160px] relative ${!unlocked ? 'blur-sm grayscale opacity-60' : ''}`}>
            {!seen ? (
                <div className="absolute inset-0 flex items-center justify-center"><Loader /></div>
            ) : !hasWebGL() ? (
                <BadgeFallback />
            ) : (
            <SceneBoundary>
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
                            <Model path={modelPath} scale={scale * 1.45} unlocked={unlocked} spin={spin} />
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
