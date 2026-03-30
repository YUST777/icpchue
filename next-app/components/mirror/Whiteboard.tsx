'use client';

import { useCallback, useEffect } from 'react';
import { useWhiteboardStore } from '@/hooks/contest/useWhiteboardStore';
import { useWhiteboardData } from '@/hooks/contest/useWhiteboardData';
import { useWhiteboardAPI } from '@/hooks/contest/useWhiteboardAPI';
import WhiteboardHeader from './WhiteboardHeader';
import WhiteboardEditor from './WhiteboardEditor';

// Import Excalidraw styles globally here to ensure they are available to all variants
import "@excalidraw/excalidraw/index.css";

interface WhiteboardProps {
    contestId: string;
    problemIndex: string;
    boardId?: string;
    variant?: 'embedded' | 'page';
}

export default function Whiteboard({
    contestId,
    problemIndex,
    boardId = 'primary',
    variant = 'embedded'
}: WhiteboardProps) {
    const isExpanded = useWhiteboardStore(state => state.isExpanded);
    const height = useWhiteboardStore(state => state.height);
    const toggleExpanded = useWhiteboardStore(state => state.toggleExpanded);

    const { savedData, isDataLoaded, saveData, clearData } = useWhiteboardData(contestId, problemIndex, boardId);
    const { api, setApi, resetScene, updateScene, handleExport } = useWhiteboardAPI();

    const effectiveIsExpanded = variant === 'page' ? true : isExpanded;

    // Sync scene with loaded data
    useEffect(() => {
        if (api && savedData) {
            updateScene(savedData);
        }
    }, [api, savedData, updateScene]);

    const handleClear = useCallback(() => {
        resetScene();
        clearData();
    }, [resetScene, clearData]);

    const handleOpenInNewTab = useCallback(() => {
        const url = `/whiteboard/${contestId}/${problemIndex}/${boardId}`;
        window.open(url, '_blank');
    }, [contestId, problemIndex, boardId]);

    if (!effectiveIsExpanded) return null;

    return (
        <div
            className={`whiteboard-container flex flex-col bg-[#0B0B0C] relative overflow-hidden ${variant === 'embedded' ? 'border-t border-white/10 w-full' : 'h-full w-full'}`}
            style={variant === 'embedded' ? {
                height: height,
                transform: 'translate(0, 0)',
                isolation: 'isolate'
            } : {
                flex: 1,
                minHeight: 0,
                transform: 'translate(0, 0)',
                isolation: 'isolate',
                zIndex: 1
            }}
        >
            <div className="relative z-30 shrink-0">
                <WhiteboardHeader
                    boardId={boardId}
                    variant={variant}
                    onClear={handleClear}
                    onExport={handleExport}
                    onOpenInNewTab={handleOpenInNewTab}
                    onToggleExpand={toggleExpanded}
                />
            </div>

            <div className="flex-1 min-h-0 relative z-20">
                {isDataLoaded ? (
                    <WhiteboardEditor
                        onApiReady={setApi}
                        onChange={saveData}
                        initialData={savedData}
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#0B0B0C]">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-5 h-5 border-2 border-[#E8C15A]/20 border-t-[#E8C15A] rounded-full animate-spin" />
                            <div className="text-[#666] text-[10px] uppercase font-bold tracking-[0.2em] animate-pulse">Synchronizing Board</div>
                        </div>
                    </div>
                )}
            </div>

            <style jsx global>{`
                .excalidraw .excalidraw-logo,
                .excalidraw .help-icon,
                .excalidraw .github-link { 
                    display: none !important; 
                }
            `}</style>
        </div>
    );
}
