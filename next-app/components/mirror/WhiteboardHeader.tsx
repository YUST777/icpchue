'use client';

import { PenTool, Maximize2, Minimize2, ExternalLink, Trash2, Download, Scan, X } from 'lucide-react';

interface WhiteboardHeaderProps {
    boardId: string;
    variant: 'embedded' | 'page';
    onClear: () => void;
    onExport?: () => void;
    onOpenInNewTab: () => void;
    onToggleExpand: () => void;
    isFullscreen: boolean;
    onFullscreen: () => void;
    onFit: () => void;
}

const controlClass = 'flex h-8 w-8 shrink-0 items-center justify-center rounded-md p-0 text-white/65 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8C15A]';

export default function WhiteboardHeader({
    boardId, variant, onClear, onExport, onOpenInNewTab, onToggleExpand,
    isFullscreen, onFullscreen, onFit
}: WhiteboardHeaderProps) {
    return (
        <div className="flex h-11 items-center justify-between gap-2 border-b border-white/10 bg-[#1c1c1f] px-2 sm:px-3">
            <div className="flex min-w-0 items-center gap-2">
                <PenTool size={15} className="shrink-0 text-[#E8C15A]" />
                <span className="truncate text-xs font-semibold text-white sm:text-sm">Whiteboard</span>
                {variant === 'page' && <span className="hidden text-[10px] text-white/40 sm:inline">{boardId}</span>}
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
                <button type="button" onClick={onFit} className={controlClass} title="Fit drawing to view" aria-label="Fit drawing to view"><Scan size={16} /></button>
                {onExport && <button type="button" onClick={onExport} className={controlClass} title="Download drawing as PNG" aria-label="Download drawing as PNG"><Download size={16} /></button>}
                <button type="button" onClick={onClear} className={`${controlClass} hover:text-red-400`} title="Clear whiteboard" aria-label="Clear whiteboard"><Trash2 size={16} /></button>
                <button type="button" onClick={onOpenInNewTab} className={`${controlClass} hidden sm:flex`} title="Open whiteboard in new tab" aria-label="Open whiteboard in new tab"><ExternalLink size={16} /></button>
                <button type="button" onClick={onFullscreen} className={`${controlClass} bg-[#E8C15A]/10 text-[#E8C15A] hover:bg-[#E8C15A]/20 hover:text-[#E8C15A]`} title={isFullscreen ? 'Exit fullscreen' : 'Expand whiteboard to fullscreen'} aria-label={isFullscreen ? 'Exit whiteboard fullscreen' : 'Expand whiteboard to fullscreen'}>
                    {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
                {variant === 'embedded' && !isFullscreen && <button type="button" onClick={onToggleExpand} className={controlClass} title="Close whiteboard" aria-label="Close whiteboard"><X size={16} /></button>}
            </div>
        </div>
    );
}
