'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useWhiteboardStore } from '@/hooks/contest/useWhiteboardStore';
import { useWhiteboardData } from '@/hooks/contest/useWhiteboardData';
import { useWhiteboardAPI } from '@/hooks/contest/useWhiteboardAPI';
import { useWhiteboardResize } from '@/hooks/contest/useWhiteboardResize';
import WhiteboardHeader from './WhiteboardHeader';
import WhiteboardEditor from './WhiteboardEditor';
import styles from './Whiteboard.module.css';

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
    const setHeight = useWhiteboardStore(state => state.setHeight);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [fullscreenZoom, setFullscreenZoom] = useState(1);
    const [heightLimit, setHeightLimit] = useState(600);
    const [hasOpened, setHasOpened] = useState(variant === 'page');
    const { handleResizeStart, isResizingWhiteboard } = useWhiteboardResize();

    const { savedData, isDataLoaded, saveData, clearData } = useWhiteboardData(contestId, problemIndex, boardId);
    const { api, setApi, resetScene, updateScene, handleExport } = useWhiteboardAPI();

    const effectiveIsExpanded = variant === 'page' ? true : isExpanded;

    useEffect(() => {
        if (!effectiveIsExpanded) return;
        const frame = requestAnimationFrame(() => {
            setHasOpened(true);
            api?.refresh();
        });
        return () => cancelAnimationFrame(frame);
    }, [effectiveIsExpanded, api]);

    useEffect(() => {
        const parent = containerRef.current?.parentElement;
        if (!parent || variant === 'page') return;
        const observer = new ResizeObserver(([entry]) => {
            setHeightLimit(Math.max(240, Math.floor(entry.contentRect.height * 0.75)));
        });
        observer.observe(parent);
        return () => observer.disconnect();
    }, [effectiveIsExpanded, variant]);

    // Sync scene with loaded data
    useEffect(() => {
        if (api && savedData) {
            updateScene(savedData);
        }
    }, [api, savedData, updateScene]);

    const handleClear = useCallback(() => {
        if (api?.getSceneElements().length && !window.confirm('Clear this whiteboard? Export your drawing first if you want to keep a copy.')) return;
        resetScene();
        clearData();
    }, [api, resetScene, clearData]);

    const handleOpenInNewTab = useCallback(() => {
        const url = `/whiteboard/${contestId}/${problemIndex}/${boardId}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    }, [contestId, problemIndex, boardId]);

    useEffect(() => {
        const onFullscreenChange = () => {
            const board = containerRef.current;
            const fullscreen = document.fullscreenElement === board;
            setIsFullscreen(fullscreen);
            // The problem workspace scales itself with CSS zoom. Cancel that
            // ancestor scale in fullscreen so drawing tools stay full-sized.
            const scale = board && fullscreen ? board.getBoundingClientRect().width / board.offsetWidth : 1;
            setFullscreenZoom(scale > 0 ? 1 / scale : 1);
            requestAnimationFrame(() => api?.refresh());
        };
        document.addEventListener('fullscreenchange', onFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
    }, [api]);

    const handleFullscreen = useCallback(async () => {
        if (document.fullscreenElement === containerRef.current) {
            await document.exitFullscreen();
        } else if (containerRef.current?.requestFullscreen) {
            try {
                await containerRef.current.requestFullscreen();
            } catch {
                api?.setToast({ message: 'Fullscreen is unavailable. Use Open in new tab for a larger canvas.' });
            }
        } else {
            handleOpenInNewTab();
        }
    }, [api, handleOpenInNewTab]);

    const handleFit = useCallback(() => {
        if (api?.getSceneElements().length) {
            api.scrollToContent(undefined, { fitToContent: true, animate: true, maxZoom: 1 });
        } else {
            api?.updateScene({ appState: { scrollX: 0, scrollY: 0, zoom: { value: 1 } } });
        }
    }, [api]);

    // Keep the scene and undo history alive when the panel is closed.
    if (!effectiveIsExpanded && !hasOpened) return null;

    return (
        <div
            ref={containerRef}
            className={`whiteboard-container ${styles.board} ${effectiveIsExpanded ? 'flex' : 'hidden'} shrink-0 flex-col bg-[#0B0B0C] relative overflow-hidden ${variant === 'embedded' ? 'border-t border-white/10 w-full' : 'h-full w-full'}`}
            style={variant === 'embedded' ? {
                height: isFullscreen ? '100%' : `min(${height}px, 75%)`,
                minHeight: isFullscreen ? 0 : 240,
                zoom: isFullscreen ? fullscreenZoom : undefined,
                isolation: 'isolate'
            } : {
                flex: 1,
                minHeight: 0,
                zoom: isFullscreen ? fullscreenZoom : undefined,
                isolation: 'isolate',
                zIndex: 1
            }}
        >
            {variant === 'embedded' && !isFullscreen && (
                <div
                    role="separator"
                    aria-label="Resize whiteboard"
                    aria-orientation="horizontal"
                    aria-valuemin={240}
                    aria-valuemax={heightLimit}
                    aria-valuenow={Math.min(height, heightLimit)}
                    tabIndex={0}
                    onPointerDown={handleResizeStart}
                    onKeyDown={(event) => {
                        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                            event.preventDefault();
                            const limit = (containerRef.current?.parentElement?.clientHeight ?? window.innerHeight) * 0.75;
                            setHeight(Math.max(240, Math.min(limit, height + (event.key === 'ArrowUp' ? 32 : -32))));
                        }
                    }}
                    className={`flex h-3 shrink-0 touch-none cursor-row-resize items-center justify-center bg-[#171719] outline-none hover:bg-white/5 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[#E8C15A] ${isResizingWhiteboard ? 'bg-white/5' : ''}`}
                    title="Drag to resize · Arrow keys adjust height"
                >
                    <span className="h-1 w-10 rounded-full bg-white/25" />
                </div>
            )}
            <div className="relative z-30 shrink-0">
                <WhiteboardHeader
                    boardId={boardId}
                    variant={variant}
                    onClear={handleClear}
                    onExport={handleExport}
                    onOpenInNewTab={handleOpenInNewTab}
                    onToggleExpand={toggleExpanded}
                    isFullscreen={isFullscreen}
                    onFullscreen={handleFullscreen}
                    onFit={handleFit}
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

        </div>
    );
}
