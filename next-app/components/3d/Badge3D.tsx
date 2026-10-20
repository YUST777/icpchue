'use client';


import { Suspense, useEffect, useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, Environment, Lightformer, Float, OrbitControls, Center, Html } from '@react-three/drei';
import * as THREE from 'three';
import Loader from '@/components/common/Loader';

interface ModelProps {
    path: string;
    scale?: number;
    unlocked?: boolean;
}

function Model({ path, scale = 1 }: ModelProps) {
    const { scene } = useGLTF(path);
    // Clone scene to avoid mutating the shared cache
    const clone = useMemo(() => scene.clone(), [scene]);
    const ref = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (ref.current) {
            // Gentle rotation
            ref.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
        }
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

export default function Badge3D({ modelPath, unlocked = true, scale = 2 }: Badge3DProps) {
    const { ref, seen, visible } = useNearViewport<HTMLDivElement>();

    return (
        <div ref={ref} className={`w-full h-full min-h-[160px] relative ${!unlocked ? 'blur-sm grayscale opacity-60' : ''}`}>
            {!seen ? (
                <div className="absolute inset-0 flex items-center justify-center"><Loader /></div>
            ) : (
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
                            <Model path={modelPath} scale={scale * 1.45} unlocked={unlocked} />
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
            )}
        </div>
    );
}
