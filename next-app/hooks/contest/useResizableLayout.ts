import { useRef, useEffect, useCallback } from 'react';

interface UseResizableLayoutReturn {
    containerRef: React.RefObject<HTMLDivElement | null>;
    leftPanelRef: React.RefObject<HTMLDivElement | null>;
    handleMouseDown: (e: React.MouseEvent) => void;
    lastWidth: React.MutableRefObject<number>;
}

export function useResizableLayout(): UseResizableLayoutReturn {
    const containerRef = useRef<HTMLDivElement>(null);
    const leftPanelRef = useRef<HTMLDivElement>(null);
    const lastWidth = useRef(50);
    const isResizingRef = useRef(false);

    // Load saved width from localStorage (instant, no API call)
    useEffect(() => {
        const savedWidth = localStorage.getItem('verdict-layout-width');
        if (savedWidth && leftPanelRef.current) {
            const width = parseFloat(savedWidth);
            if (!isNaN(width) && width >= 20 && width <= 80) {
                lastWidth.current = width;
                leftPanelRef.current.style.setProperty('--panel-width', `${width}%`);
            }
        }
    }, []);

    // Ghost Resizer approach — zero layout reflow during drag
    useEffect(() => {
        let animationFrameId: number;
        let ghostLine: HTMLDivElement | null = null;

        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizingRef.current || !containerRef.current) return;

            if (animationFrameId) cancelAnimationFrame(animationFrameId);

            animationFrameId = requestAnimationFrame(() => {
                if (!containerRef.current) return;
                
                // Keep ghost line synced with mouse
                if (!ghostLine) {
                    ghostLine = document.getElementById('ghost-resizer') as HTMLDivElement;
                }
                
                if (ghostLine) {
                    const containerRect = containerRef.current.getBoundingClientRect();
                    let newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
                    
                    // Clamp widths
                    if (newWidth < 20) newWidth = 20;
                    if (newWidth > 80) newWidth = 80;
                    
                    ghostLine.style.left = `${newWidth}%`;
                    lastWidth.current = newWidth;
                }
            });
        };

        const handleMouseUp = () => {
            if (!isResizingRef.current) return;
            isResizingRef.current = false;
            
            // Clean up global styles
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            
            // Remove overlay and ghost line
            const overlay = document.getElementById('resize-overlay');
            if (overlay) overlay.remove();
            
            if (ghostLine) {
                ghostLine.remove();
                ghostLine = null;
            } else {
                const existingGhost = document.getElementById('ghost-resizer');
                if (existingGhost) existingGhost.remove();
            }

            // Apply final width ONLY on mouseup (no reflow during drag!)
            if (leftPanelRef.current) {
                leftPanelRef.current.style.setProperty('--panel-width', `${lastWidth.current}%`);
            }
            
            // Save state
            localStorage.setItem('verdict-layout-width', lastWidth.current.toString());
            
            // Fire-and-forget DB save
            fetch('/api/user/preferences', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ prefs: { 'verdict-layout-width': lastWidth.current.toString() } }),
            }).catch(() => {});
            
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            
            // Ensure cleanup
            const existingGhost = document.getElementById('ghost-resizer');
            if (existingGhost) existingGhost.remove();
        };
    }, []);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        isResizingRef.current = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        
        // Add a transparent overlay to prevent Monaco editor / iframes from stealing mouse events
        const overlay = document.createElement('div');
        overlay.id = 'resize-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:9998;cursor:col-resize;';
        document.body.appendChild(overlay);

        // Create the ghost resizer line
        if (containerRef.current) {
            const ghost = document.createElement('div');
            ghost.id = 'ghost-resizer';
            ghost.style.cssText = `
                position: absolute;
                top: 0;
                bottom: 0;
                width: 2px;
                background-color: #E8C15A;
                z-index: 9999;
                transform: translateX(-50%);
                left: ${lastWidth.current}%;
            `;
            containerRef.current.appendChild(ghost);
        }
    }, []);

    return {
        containerRef,
        leftPanelRef,
        handleMouseDown,
        lastWidth
    };
}
