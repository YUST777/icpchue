"use client";

import { CFProblemData } from "../shared/types";
import type { SheetProblem } from "./ProblemDrawer";
import {
    HeaderLogo,
    NavigationBlock,
    HeaderActions,
    MobileViewToggle,
    useNavigationIds,
} from "../header";
import { Play, CloudUpload, StickyNote, Loader2 } from "lucide-react";
import { SidebarToggleIcon } from "@/components/ui/icons/SidebarToggleIcon";
import { Tooltip } from "@/components/ui/Tooltip";

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
    activeTab: 'description' | 'submissions' | 'analytics' | 'solution';
    setActiveTab: (tab: 'description' | 'submissions' | 'analytics' | 'solution') => void;
    showNotes: boolean;
    setShowNotes: (show: boolean) => void;
}

export default function ProblemHeader({
    problem,
    mobileView,
    setMobileView,
    navigationBaseUrl,
    problemId,
    onOpenDrawer,
    sheetProblems,
    onSubmit,
    onRunTests,
    submitting,
    activeTab,
    setActiveTab,
    showNotes,
    setShowNotes
}: ProblemHeaderProps) {
    const { prevId, nextId, prevProblem, nextProblem, getRandomId } =
        useNavigationIds({ problemId, sheetProblems });

    return (
        <div className="flex flex-col gap-4 border-b border-white/10 bg-[#121212] px-4 py-2 shrink-0 relative z-[100]">
            <div className="h-12 sm:h-14 flex items-center justify-between px-3 sm:px-4 w-full min-h-[48px] relative">
                {/* Left Side: Logo + Navigation */}
                <div className="flex items-center gap-2">
                    <HeaderLogo navigationBaseUrl={navigationBaseUrl} />
                    <NavigationBlock
                        navigationBaseUrl={navigationBaseUrl}
                        prevId={prevId}
                        nextId={nextId}
                        prevLabel={
                            prevProblem
                                ? `Prev: ${prevProblem.name}`
                                : undefined
                        }
                        nextLabel={
                            nextProblem
                                ? `Next: ${nextProblem.name}`
                                : undefined
                        }
                        onOpenDrawer={onOpenDrawer}
                        showShuffle={
                            !!(sheetProblems && sheetProblems.length > 1)
                        }
                        onShuffle={getRandomId}
                    />
                </div>

                {/* Center: Submit & Run Actions (Prominent) */}
                <div className="hidden lg:flex flex-col min-w-0 flex-1 items-center justify-center absolute left-1/2 -translate-x-1/2">
                    <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.02] border border-white/5">
                        <Tooltip content="Run Local Tests" position="bottom">
                            <button
                                onClick={onRunTests}
                                disabled={submitting}
                                className="p-2 w-10 h-10 flex items-center justify-center bg-[#1e1e1e] hover:bg-[#2a2a2a] disabled:opacity-50 disabled:cursor-not-allowed text-white/70 hover:text-white rounded-lg transition-all border border-white/5 hover:border-white/10"
                            >
                                <Play size={18} fill="currentColor" className="ml-0.5" />
                            </button>
                        </Tooltip>

                        <Tooltip content="Submit to Codeforces" position="bottom">
                            <button
                                onClick={onSubmit}
                                disabled={submitting}
                                className="flex items-center gap-2 px-5 h-10 bg-[#1e1e1e] hover:bg-[#2a2a2a] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all border border-white/5 hover:border-white/10 min-w-[120px] justify-center"
                            >
                                <CloudUpload size={18} className="text-[#E8C15A]" />
                                <span className="text-sm">Submit</span>
                            </button>
                        </Tooltip>

                        <Tooltip content="Problem Notes" position="bottom">
                            <button
                                onClick={() => setShowNotes(!showNotes)}
                                className={`p-2 w-10 h-10 flex items-center justify-center rounded-lg transition-all border ${
                                    showNotes
                                    ? 'bg-[#E8C15A]/10 border-[#E8C15A]/30 text-[#E8C15A]'
                                    : 'bg-[#1e1e1e] border-white/5 text-white/40 hover:text-white hover:bg-[#2a2a2a] hover:border-white/10'
                                }`}
                            >
                                <StickyNote size={18} />
                            </button>
                        </Tooltip>
                    </div>
                </div>

                {/* Right Side: Actions (Desktop) */}
                <HeaderActions />

                {/* Mobile View Toggle */}
                <MobileViewToggle
                    mobileView={mobileView}
                    setMobileView={setMobileView}
                    variant="pill"
                />
            </div>
        </div>
    );
}
