'use client';

import { Minimize2, ExternalLink, Trash2, Download } from 'lucide-react';

interface WhiteboardHeaderProps {
    boardId: string;
    variant: 'embedded' | 'page';
    onClear: () => void;
    onExport?: () => void;
    onOpenInNewTab: () => void;
    onToggleExpand: () => void;
}

export default function WhiteboardHeader({
    boardId,
    variant,
    onClear,
    onExport,
    onOpenInNewTab,
    onToggleExpand
}: WhiteboardHeaderProps) {
    return (
        <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[#E8C15A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <path d="M9 9l6 6m0-6l-6 6" />
                </svg>
                <span className="text-sm font-medium text-white">Whiteboard</span>
                {variant === 'page' && (
                    <span className="text-[10px] uppercase tracking-[0.18em] text-white/40">{boardId}</span>
                )}
            </div>
            <div className="flex items-center gap-2">
                {onExport && (
                    <button
                        onClick={onExport}
                        className="p-1.5 text-[#E8C15A] hover:text-[#f0d080] transition-colors rounded hover:bg-white/5"
                        title="Download as Image"
                    >
                        <Download size={14} />
                    </button>
                )}
                <button
                    onClick={onClear}
                    className="p-1.5 text-[#666] hover:text-red-400 transition-colors rounded hover:bg-white/5"
                    title="Clear whiteboard"
                >
                    <Trash2 size={14} />
                </button>
                <button
                    onClick={onOpenInNewTab}
                    className="p-1.5 text-[#666] hover:text-white transition-colors rounded hover:bg-white/5"
                    title="Open in new tab"
                >
                    <ExternalLink size={14} />
                </button>
                {variant === 'embedded' && (
                    <button
                        onClick={onToggleExpand}
                        className="p-1.5 text-[#666] hover:text-white transition-colors rounded hover:bg-white/5"
                        title="Minimize"
                    >
                        <Minimize2 size={14} />
                    </button>
                )}
            </div>
        </div>
    );
}
