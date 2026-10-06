import { useEffect, useState } from 'react';

// The problem page is designed for roughly this much space. Smaller windows
// (laptops, 125%/150% Windows scaling) scale down so everything fits without
// the student zooming the browser out; large screens show it at full size.
const DESIGN_WIDTH = 1600;
const DESIGN_HEIGHT = 940;
const MIN_ZOOM = 0.7;
const MAX_ZOOM = 1;
// Phones use the stacked mobile layout, which was tuned at this zoom.
const MOBILE_BREAKPOINT = 768;
const MOBILE_ZOOM = 0.85;

function computeZoom(): number {
    if (typeof window === 'undefined') return MOBILE_ZOOM;
    const { innerWidth: w, innerHeight: h } = window;
    if (w < MOBILE_BREAKPOINT) return MOBILE_ZOOM;
    const fit = Math.min(w / DESIGN_WIDTH, h / DESIGN_HEIGHT);
    return Math.round(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, fit)) * 100) / 100;
}

/** CSS zoom that makes the IDE-style problem page fit the current window. */
export function useFitZoom(): number {
    const [zoom, setZoom] = useState(MOBILE_ZOOM);

    useEffect(() => {
        let frame = 0;
        const update = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => setZoom(computeZoom()));
        };
        update();
        window.addEventListener('resize', update);
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener('resize', update);
        };
    }, []);

    return zoom;
}
