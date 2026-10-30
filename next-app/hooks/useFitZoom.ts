import { useEffect, useState, useLayoutEffect } from 'react';

// The problem page is designed for roughly this much space. Smaller windows
// (laptops, 125%/150% Windows scaling) scale down so everything fits without
// the student zooming the browser out; large screens show it at full size.
const DESIGN_WIDTH = 1600;
const DESIGN_HEIGHT = 940;
const MIN_ZOOM = 0.7;
const MAX_ZOOM = 1;
// Phones use the stacked mobile layout at full size: shrinking it made text
// and tap targets too small and offsets Monaco's caret under CSS zoom.
const MOBILE_BREAKPOINT = 768;
const MOBILE_ZOOM = 1;

export function computeZoom(): number {
    if (typeof window === 'undefined') return 0.85;
    const { innerWidth: w, innerHeight: h } = window;
    if (w < MOBILE_BREAKPOINT) return MOBILE_ZOOM;
    const fit = Math.min(w / DESIGN_WIDTH, h / DESIGN_HEIGHT);
    return Math.round(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, fit)) * 100) / 100;
}

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/** CSS zoom that makes the IDE-style problem page fit the current window without initial zoom flicker. */
export function useFitZoom(): number {
    const [zoom, setZoom] = useState<number>(() => computeZoom());

    useIsomorphicLayoutEffect(() => {
        const update = () => {
            setZoom(computeZoom());
        };
        update();
        window.addEventListener('resize', update);
        return () => {
            window.removeEventListener('resize', update);
        };
    }, []);

    return zoom;
}
