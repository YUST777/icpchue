'use client';

import React from 'react';
import dynamic from 'next/dynamic';

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
    return (
        <div className="h-full w-full relative bg-[#121212]">
            <Excalidraw
                excalidrawAPI={onApiReady}
                onChange={onChange}
                initialData={initialData}
                theme="dark"
                UIOptions={{
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
