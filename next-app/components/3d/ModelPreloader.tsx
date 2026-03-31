'use client';

import { useGLTF } from '@react-three/drei';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const MODELS = [
    '/3d/WELCOME.glb',
    '/3d/done_approvalcamp.glb',
    '/3d/sheet1.glb',
    '/3d/500pts.glb',
    '/3d/instructor.glb'
];

/**
 * Only preloads 3D models when the user is on pages that actually show them.
 * Previously loaded on every page, wasting bandwidth and memory.
 */
export default function ModelPreloader() {
    const pathname = usePathname();

    useEffect(() => {
        // Only preload on pages that show 3D badges
        const needsModels = pathname?.includes('/achievements') || pathname?.includes('/profile');
        if (!needsModels) return;

        MODELS.forEach(path => {
            useGLTF.preload(path);
        });
    }, [pathname]);

    return null;
}
