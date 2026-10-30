"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { useFitZoom } from "@/hooks/useFitZoom";

// Mirrors the real problem page block for block (ProblemHeader, ProblemTabs,
// EditorToolbar, collapsed test panel) so nothing jumps when it swaps in.
const TAB_WIDTHS = [96, 112, 92, 84, 104]; // Description, Submissions, Analytics, Solution, Whiteboard
const CODE_LINES = [52, 44, 0, 30, 58, 40, 0, 26, 8];
const DEFAULT_PANEL_WIDTH = 50; // useResizableLayout default

export default function MirrorSkeleton() {
    const fitZoom = useFitZoom();
    const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH);

    // Same saved split as the real page, so the divider does not jump.
    useEffect(() => {
        try {
            const saved = parseFloat(localStorage.getItem("verdict-layout-width") || "");
            if (!isNaN(saved) && saved >= 20 && saved <= 80) setPanelWidth(saved);
        } catch {
            // Storage unavailable: keep the default split.
        }
    }, []);

    return (
        <div
            className="mirror-ui fixed inset-0 bg-[#0B0B0C] text-[#DCDCDC] z-50 flex flex-col overflow-hidden"
            style={{ zoom: fitZoom }}
            role="status"
            aria-label="Loading problem"
        >
            {/* ProblemHeader: px-4 py-2 wrapper, h-12 sm:h-14 row */}
            <div className="border-b border-white/10 bg-[#121212] px-4 py-2 shrink-0">
                <div className="h-12 sm:h-14 flex items-center justify-between px-3 sm:px-4 relative">
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-9 w-9 rounded-lg" />
                        <Skeleton className="h-8 w-8 lg:w-32 rounded-md ml-2" />
                        <Skeleton className="h-8 w-20 rounded-md" />
                    </div>
                    <div className="hidden md:flex items-center gap-1.5 p-1 rounded-xl border border-white/5 lg:absolute lg:left-1/2 lg:-translate-x-1/2">
                        <Skeleton className="hidden lg:block h-10 w-10 rounded-lg" />
                        <Skeleton className="h-10 w-10 rounded-lg" />
                        <Skeleton className="h-10 w-24 lg:w-[120px] rounded-lg" />
                        <Skeleton className="h-10 w-10 rounded-lg" />
                    </div>
                    <div className="hidden md:flex items-center gap-2">
                        <Skeleton className="h-8 w-8 rounded-md" />
                        <Skeleton className="h-8 w-14 rounded-md" />
                        <Skeleton className="h-8 w-16 rounded-md" />
                    </div>
                    <Skeleton className="md:hidden h-8 w-24 rounded-lg" />
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Left panel: tabs + description, at the saved width */}
                <div className="hidden md:flex flex-col shrink-0 border-r border-white/5 bg-[#0B0B0C] min-w-0" style={{ width: `${panelWidth}%` }}>
                    <div className="flex border-b border-white/10 bg-[#1a1a1a] shrink-0 overflow-hidden">
                        {TAB_WIDTHS.map((w, i) => (
                            <div key={i} className="min-h-[44px] px-3 sm:px-6 flex items-center shrink-0">
                                <Skeleton className="h-3.5 rounded" style={{ width: w }} />
                            </div>
                        ))}
                    </div>
                    <div className="p-6 sm:p-8 space-y-5 overflow-hidden">
                        <Skeleton className="h-10 w-2/3 rounded-lg" />
                        <div className="flex gap-4">
                            <Skeleton className="h-5 w-24 rounded" />
                            <Skeleton className="h-5 w-24 rounded" />
                        </div>
                        <div className="h-px bg-white/5" />
                        <div className="space-y-3">
                            <Skeleton className="h-4 w-full rounded" />
                            <Skeleton className="h-4 w-11/12 rounded" />
                            <Skeleton className="h-4 w-4/6 rounded" />
                        </div>
                        <div className="space-y-3 pt-2">
                            <Skeleton className="h-4 w-1/2 rounded" />
                            <Skeleton className="h-4 w-2/5 rounded" />
                            <Skeleton className="h-4 w-1/2 rounded" />
                        </div>
                        <Skeleton className="h-20 w-full rounded-xl" />
                    </div>
                </div>

                <div className="hidden md:block w-1 bg-white/5 shrink-0" />

                {/* Editor: toolbar, code, collapsed test panel */}
                <div className="flex-1 flex flex-col bg-[#1e1e1e] min-w-0">
                    <div className="h-10 px-3 flex items-center justify-between bg-[#1a1a1a] border-b border-white/10 shrink-0">
                        <Skeleton className="h-4 w-12 rounded" />
                        <div className="flex items-center gap-4">
                            {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-4 w-4 rounded" />)}
                        </div>
                    </div>
                    <div className="flex-1 pt-3 space-y-[9px] overflow-hidden">
                        {CODE_LINES.map((w, i) => (
                            <div key={i} className="flex items-center gap-6 pl-6 h-[15px]">
                                <Skeleton className="h-3 w-3 opacity-30 shrink-0" />
                                {w > 0 && <Skeleton className="h-3 rounded opacity-50" style={{ width: `${w}%` }} />}
                            </div>
                        ))}
                    </div>
                    <div className="h-[42px] shrink-0 bg-[#1a1a1a] flex items-center gap-6 px-5 border-t border-white/10">
                        <Skeleton className="h-4 w-20 rounded" />
                        <Skeleton className="h-4 w-24 rounded" />
                        <Skeleton className="h-4 w-24 rounded" />
                    </div>
                </div>
            </div>
        </div>
    );
}
