'use client';

import React, { useCallback, useLayoutEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import dynamic from 'next/dynamic';
import styles from './Whiteboard.module.css';

// Import the library directly with No SSR
const Excalidraw = dynamic(
    async () => {
        const { Excalidraw } = await import("@excalidraw/excalidraw");
        return Excalidraw;
    },
    {
        ssr: false,
        loading: () => (
            <div className="flex items-center justify-center h-full bg-[#121212]">
                <div className="flex flex-col items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/5 border-t-white/40 rounded-full animate-spin" />
                    <div className="text-[#666] text-[10px] uppercase tracking-widest italic">Loading Engine</div>
                </div>
            </div>
        ),
    }
);

interface WhiteboardEditorProps {
    onApiReady: (api: any) => void;
    onChange: (elements: readonly any[], appState: any) => void;
    initialData?: any;
}

export default function WhiteboardEditor({
    onApiReady,
    onChange,
    initialData
}: WhiteboardEditorProps) {
    const surfaceRef = useRef<HTMLDivElement>(null);
    const apiRef = useRef<{ refresh: () => void } | null>(null);

    const handleApiReady = useCallback<WhiteboardEditorProps['onApiReady']>((api) => {
        apiRef.current = api;
        onApiReady(api);
    }, [onApiReady]);

    const syncScale = useCallback(() => {
        const surface = surfaceRef.current;
        if (!surface) return;
        let scale = 1;
        for (let element = surface.parentElement; element; element = element.parentElement) {
            const zoom = getComputedStyle(element).zoom;
            const value = parseFloat(zoom) / (zoom.endsWith('%') ? 100 : 1);
            if (Number.isFinite(value) && value > 0) scale *= value;
        }
        // Excalidraw measures in viewport pixels. Keep its CSS pixels at
        // the same scale, even when the surrounding IDE uses CSS zoom.
        surface.style.zoom = String(1 / scale);
    }, []);

    useLayoutEffect(() => {
        const surface = surfaceRef.current;
        const parent = surface?.parentElement;
        if (!surface || !parent) return;

        let frame = 0;
        const refreshScale = () => {
            syncScale();
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => apiRef.current?.refresh());
        };

        const observer = new ResizeObserver(refreshScale);
        observer.observe(parent);
        window.addEventListener('resize', refreshScale);
        document.addEventListener('fullscreenchange', refreshScale);
        refreshScale();
        return () => {
            observer.disconnect();
            window.removeEventListener('resize', refreshScale);
            document.removeEventListener('fullscreenchange', refreshScale);
            cancelAnimationFrame(frame);
        };
    }, [syncScale]);

    const handlePointerDownCapture = useCallback(() => {
        syncScale();
        // A resize can move the canvas before its observer runs. Commit the
        // current origin before Excalidraw handles the first drawing point.
        flushSync(() => apiRef.current?.refresh());
    }, [syncScale]);

    return (
        <div ref={surfaceRef} onPointerDownCapture={handlePointerDownCapture} className={`${styles.surface} absolute inset-0 bg-[#121212]`}>
            <Excalidraw
                excalidrawAPI={handleApiReady}
                onChange={onChange}
                initialData={{
                    ...initialData,
                    appState: {
                        viewBackgroundColor: '#ffffff',
                        currentItemStrokeColor: '#1e1e1e',
                        activeTool: { type: 'freedraw', lastActiveTool: null, customType: null, locked: false },
                        ...initialData?.appState,
                    },
                }}
                theme="dark"
                handleKeyboardGlobally={false}
                autoFocus={false}
                UIOptions={{
                    welcomeScreen: false,
                    canvasActions: {
                        saveAsImage: false,
                        loadScene: false,
                        export: false,
                        clearCanvas: false,
                    },
                }}
            />
        </div>
    );
}
