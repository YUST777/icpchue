"use client";

import Link from "next/link";
import Image from "next/image";
import {
    ArrowLeft, ChevronLeft, ChevronRight, FileText, Code,
    List, Shuffle, PanelLeft, Play,
    CloudUpload, Sparkles
} from "lucide-react";
import { SidebarToggleIcon } from "@/components/ui/icons/SidebarToggleIcon";
import { CFProblemData } from "../shared/types";
import type { SheetProblem } from "./ProblemDrawer";

interface ProblemHeaderProps {
    sheetId: string;
    problem: CFProblemData | null;
    mobileView: "problem" | "code";
    setMobileView: (view: "problem" | "code") => void;
    navigationBaseUrl: string;
    problemId: string;
    onToggleSidebar: () => void;
    onOpenDrawer?: () => void;
    sheetProblems?: SheetProblem[];
    onSubmit: () => void;
    onRunTests: () => void;
    submitting: boolean;
}

export default function ProblemHeader({
    sheetId,
    problem,
    mobileView,
    setMobileView,
    navigationBaseUrl,
    problemId,
    onToggleSidebar,
    onOpenDrawer,
    sheetProblems,
    onSubmit,
    onRunTests,
    submitting,
}: ProblemHeaderProps) {
    const currentId = problemId || "";

    const currentIndex = sheetProblems?.findIndex(
        (p) => p.index.trim().toUpperCase() === currentId.trim().toUpperCase()
    ) ?? -1;

    const prevProblem = currentIndex > 0 ? sheetProblems![currentIndex - 1] : null;
    const nextProblem =
        currentIndex >= 0 && sheetProblems && currentIndex < sheetProblems.length - 1
            ? sheetProblems[currentIndex + 1]
            : null;

    const getNextIdFallback = (id: string) => {
        if (!id) return null;
        const digitMatch = id.match(/(\d+)$/);
        if (digitMatch) {
            const num = parseInt(digitMatch[1]);
            const prefix = id.slice(0, -digitMatch[0].length);
            return `${prefix}${num + 1}`;
        }
        const charCode = id.charCodeAt(id.length - 1);
        if (charCode >= 65 && charCode < 90) return id.slice(0, -1) + String.fromCharCode(charCode + 1);
        return null;
    };

    const getPrevIdFallback = (id: string) => {
        if (!id) return null;
        const digitMatch = id.match(/(\d+)$/);
        if (digitMatch) {
            const num = parseInt(digitMatch[1]);
            if (num > 1) {
                const prefix = id.slice(0, -digitMatch[0].length);
                return `${prefix}${num - 1}`;
            }
            return null;
        }
        const charCode = id.charCodeAt(id.length - 1);
        if (charCode > 65 && charCode <= 90) return id.slice(0, -1) + String.fromCharCode(charCode - 1);
        return null;
    };

    const prevId = prevProblem ? prevProblem.index : getPrevIdFallback(currentId);
    const nextId = nextProblem ? nextProblem.index : getNextIdFallback(currentId);

    const getRandomId = () => {
        if (!sheetProblems || sheetProblems.length <= 1) return null;
        const others = sheetProblems.filter(
            (p) => p.index.toUpperCase() !== currentId.toUpperCase()
        );
        if (others.length === 0) return null;
        return others[Math.floor(Math.random() * others.length)].index;
    };

    const title = problem?.meta?.title || "Loading...";
    const showIdPrefix = problemId && !title.startsWith(problemId + ".");

    const sheetLabel = sheetProblems
        ? `${currentIndex + 1}/${sheetProblems.length}`
        : null;

    return (
        <div className="flex flex-col gap-4 border-b border-white/10 bg-[#121212] px-4 py-2 shrink-0">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 overflow-hidden">
                    <Link
                        href={navigationBaseUrl}
                        className="p-1.5 -ml-1 text-white/50 hover:text-white hover:bg-white/5 rounded-md transition-all flex items-center justify-center shrink-0"
                        title="Back to sheet"
                    >
                        <ArrowLeft size={16} />
                    </Link>
                    {onOpenDrawer && (
                        <button
                            onClick={onOpenDrawer}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-all text-xs font-medium shrink-0 border border-white/8 hover:border-white/15"
                            title="Problem List"
                        >
                            <List size={14} />
                            <span className="hidden sm:inline">Problems</span>
                            {sheetLabel && (
                                <span className="text-[10px] font-mono text-white/30 ml-0.5">
                                    {sheetLabel}
                                </span>
                            )}
                        </button>
                    )}

                    <div className="flex flex-col min-w-0 flex-1 items-center justify-center">
                        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5 backdrop-blur-md shadow-2xl">
                            <button
                                onClick={onRunTests}
                                disabled={submitting}
                                className="p-2 w-10 h-10 flex items-center justify-center bg-[#1e1e1e] hover:bg-[#2a2a2a] disabled:opacity-50 disabled:cursor-not-allowed text-white/70 hover:text-white rounded-lg transition-all border border-white/5 hover:border-white/10"
                                title="Run Local Tests"
                            >
                                <Play size={18} fill="currentColor" className="ml-0.5" />
                            </button>
                            
                            <button
                                onClick={onSubmit}
                                disabled={submitting}
                                className="flex items-center gap-2 px-5 h-10 bg-[#1e1e1e] hover:bg-[#2a2a2a] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all border border-white/5 hover:border-white/10 min-w-[120px] justify-center"
                                title="Submit to Codeforces"
                            >
                                <CloudUpload size={18} className="text-[#E8C15A]" />
                                <span className="text-sm">Submit</span>
                            </button>

                            <button
                                className="p-2 w-10 h-10 flex items-center justify-center bg-[#1e1e1e] hover:bg-[#2a2a2a] text-white/70 hover:text-white rounded-lg transition-all border border-white/5 hover:border-white/10"
                                title="AI Assistance"
                            >
                                <Sparkles size={18} className="text-[#E8C15A]/80" />
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center shrink-0 gap-0.5 ml-2">
                        <Link
                            href={prevId ? `${navigationBaseUrl}/${prevId.trim()}` : "#"}
                            className={`p-1.5 rounded-md active:bg-white/20 transition-all flex items-center justify-center touch-manipulation min-w-[28px] min-h-[28px] ${prevId
                                ? "text-white/70 active:text-white hover:bg-white/5"
                                : "text-white/20 cursor-not-allowed pointer-events-none"
                                }`}
                            aria-disabled={!prevId}
                            title={prevProblem ? `Prev: ${prevProblem.name}` : "Previous problem"}
                        >
                            <ChevronLeft size={16} />
                        </Link>
                        <Link
                            href={nextId ? `${navigationBaseUrl}/${nextId.trim()}` : "#"}
                            className={`p-1.5 rounded-md active:bg-white/20 transition-all flex items-center justify-center touch-manipulation min-w-[28px] min-h-[28px] ${nextId
                                ? "text-white/70 active:text-white hover:bg-white/5"
                                : "text-white/20 cursor-not-allowed pointer-events-none"
                                }`}
                            aria-disabled={!nextId}
                            title={nextProblem ? `Next: ${nextProblem.name}` : "Next problem"}
                        >
                            <ChevronRight size={16} />
                        </Link>
                        {sheetProblems && sheetProblems.length > 1 && (
                            <Link
                                href={(() => {
                                    const rid = getRandomId();
                                    return rid ? `${navigationBaseUrl}/${rid}` : "#";
                                })()}
                                className="p-1.5 rounded-md text-white/40 hover:text-white/70 hover:bg-white/5 transition-all flex items-center justify-center touch-manipulation min-w-[28px] min-h-[28px]"
                                title="Random problem"
                            >
                                <Shuffle size={14} />
                            </Link>
                        )}
                    </div>
                </div>

                {/* Mobile View Toggle */}
                <div className="flex md:hidden bg-[#1a1a1a] p-0.5 rounded-lg border border-white/10 shrink-0">
                    <button
                        onClick={() => setMobileView("problem")}
                        className={`p-1.5 rounded-md transition-all ${mobileView === "problem"
                            ? "bg-[#2a2a2a] text-white shadow-sm"
                            : "text-white/40 hover:text-white/60"
                            }`}
                    >
                        <FileText size={14} strokeWidth={2.5} />
                    </button>
                    <button
                        onClick={() => setMobileView("code")}
                        className={`p-1.5 rounded-md transition-all ${mobileView === "code"
                            ? "bg-[#2a2a2a] text-white shadow-sm"
                            : "text-white/40 hover:text-white/60"
                            }`}
                    >
                        <Code size={14} strokeWidth={2.5} />
                    </button>
                </div>

                {/* Desktop Logo */}
                <div className="hidden md:flex items-center gap-4">
                    <div className="relative flex items-center group">
                        <div className="opacity-80 hover:opacity-100 transition-opacity cursor-default">
                            <Image
                                src="/icpchue-logo.webp"
                                alt="ICPC HUE"
                                width={24}
                                height={24}
                                className="rounded-full"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
