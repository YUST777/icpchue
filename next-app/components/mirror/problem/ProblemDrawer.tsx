"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
    X, Search, Link as LinkIcon, ArrowRight, Loader2,
    CheckCircle2, Circle, ChevronRight
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
    parseCodeforcesUrl,
    getInternalRoute,
    getDifficultyColor,
    ParsedCodeforcesUrl,
} from "@/lib/parseCodeforcesUrl";
import { getNavigationBaseUrl } from "@/lib/utils/codeforcesUtils";

/* ─── Types ─── */
export interface SheetProblem {
    contestId: number;
    index: string;
    name: string;
    rating?: number;
    tags?: string[];
}

export interface ActiveSheet {
    contestId: string;
    contestType: "contest" | "gym" | "group";
    groupId?: string;
    problems: SheetProblem[];
    lastAccessedAt: string;
}

interface ProblemDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    currentContestId: string;
    currentProblemId: string;
    urlType: string;
    groupId?: string;
    /** Called when a new sheet is loaded — parent can update navigation */
    onSheetLoaded?: (sheet: ActiveSheet) => void;
    /** External sheet data if parent already loaded it */
    sheet?: ActiveSheet | null;
    /** The ICPhue DB sheetId (if available) */
    sheetId?: string;
    levelSlug?: string;
    sheetSlug?: string;
}

/* ─── Backdrop ─── */
const Backdrop = ({ onClick }: { onClick: () => void }) => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClick}
        className="fixed inset-0 bg-black/60 z-[998] backdrop-blur-[2px]"
    />
);

/* ─── Main Drawer ─── */
export default function ProblemDrawer({
    isOpen,
    onClose,
    currentContestId,
    currentProblemId,
    urlType,
    groupId,
    onSheetLoaded,
    sheet: externalSheet,
    sheetId,
    levelSlug,
    sheetSlug,
}: ProblemDrawerProps) {
    const router = useRouter();
    const { user } = useAuth();
    const inputRef = useRef<HTMLInputElement>(null);

    // Local state
    const [sheet, setSheet] = useState<ActiveSheet | null>(externalSheet ?? null);
    const [search, setSearch] = useState("");
    const [urlInput, setUrlInput] = useState("");
    const [loadingSheet, setLoadingSheet] = useState(false);
    const [loadingPersisted, setLoadingPersisted] = useState(true);
    const [solvedSet, setSolvedSet] = useState<Set<string>>(new Set());

    // Track which contestId we've already loaded to prevent re-fetches
    const loadedContestRef = useRef<string | null>(null);

    // Sync external sheet
    useEffect(() => {
        if (externalSheet) setSheet(externalSheet);
    }, [externalSheet]);

    // Load the correct sheet for the CURRENT contest from DB or CF API
    useEffect(() => {
        if (!currentContestId) { setLoadingPersisted(false); return; }
        // Don't re-load if we already loaded this contest
        if (loadedContestRef.current === currentContestId) return;

        let cancelled = false;

        (async () => {
            setLoadingPersisted(true);

            // Step 1: Use ICPChue curriculum sheets if we have a sheetId!
            if (sheetId) {
                try {
                    const res = await fetch(`/api/curriculum/problems/${sheetId}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.success && data.problems?.length > 0) {
                            if (!cancelled) {
                                const cachedSheet: ActiveSheet = {
                                    contestId: data.sheet.contestId || currentContestId,
                                    contestType: "contest",
                                    lastAccessedAt: new Date().toISOString(),
                                    problems: data.problems.map((p: any) => ({
                                        index: (p.letter || p.title.split('.')[0] || 'A').trim(),
                                        name: p.title,
                                        rating: p.rating,
                                        contestId: Number(data.sheet.contestId) || 0,
                                    }))
                                };
                                setSheet(cachedSheet);
                                onSheetLoaded?.(cachedSheet);
                                loadedContestRef.current = currentContestId;
                                setLoadingPersisted(false);
                            }
                            return;
                        }
                    }
                } catch { }
            }

            // Step 2: Try loading from User cache (keyed by contestId)
            if (user) {
                try {
                    const res = await fetch(`/api/user/sheets?contestId=${currentContestId}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.data && data.data.problems?.length > 0) {
                            if (!cancelled) {
                                const cachedSheet = data.data as ActiveSheet;
                                setSheet(cachedSheet);
                                onSheetLoaded?.(cachedSheet);
                                loadedContestRef.current = currentContestId;
                                setLoadingPersisted(false);
                            }
                            return;
                        }
                    }
                } catch { }
            }

            // Step 3: Not cached — lazy-load from CF API
            if (!cancelled) {
                const cType = urlType === "gym" ? "gym" : urlType === "group" ? "group" : "contest";
                await loadContestProblems(currentContestId, cType as any, groupId);
                if (!cancelled) {
                    loadedContestRef.current = currentContestId;
                }
            }

            if (!cancelled) setLoadingPersisted(false);
        })();

        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentContestId, user]);

    // Fetch solved problems for the current sheet/contest
    useEffect(() => {
        if (!sheet || !user) return;
        let cancelled = false;

        const fetchSolved = async () => {
            try {
                const params = new URLSearchParams();
                if (sheetId) params.set('sheetId', sheetId);
                params.set('contestId', sheet.contestId);
                
                const res = await fetch(`/api/submissions?${params}`);
                if (res.ok) {
                    const data = await res.json();
                    if (!cancelled && data.success) {
                        const solved = new Set<string>();
                        data.submissions.forEach((s: any) => {
                            if (s.verdict === 'Accepted' || s.verdict === 'OK') {
                                solved.add(`${s.contestId}-${s.problemId}`);
                            }
                        });
                        setSolvedSet(solved);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch solved status:', err);
            }
        };

        fetchSolved();
        return () => { cancelled = true; };
    }, [sheet, user, sheetId]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen]);

    /* ─── Load contest problems from CF API ─── */
    const loadContestProblems = useCallback(async (
        contestId: string,
        contestType: "contest" | "gym" | "group",
        grpId?: string
    ) => {
        setLoadingSheet(true);
        try {
            const cfRes = await fetch(
                `https://codeforces.com/api/contest.standings?contestId=${contestId}&from=1&count=1`
            );
            const data = await cfRes.json();

            if (data.status === "OK" && data.result?.problems) {
                const newSheet: ActiveSheet = {
                    contestId,
                    contestType,
                    groupId: grpId,
                    problems: data.result.problems.map((p: any) => ({
                        contestId: p.contestId,
                        index: p.index,
                        name: p.name,
                        rating: p.rating,
                        tags: p.tags,
                    })),
                    lastAccessedAt: new Date().toISOString(),
                };
                setSheet(newSheet);
                onSheetLoaded?.(newSheet);

                // Persist to DB cache
                if (user) {
                    fetch("/api/user/sheets", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ sheet: newSheet }),
                    }).catch(() => { });
                }
            }
        } catch (err) {
            console.error("Failed to load contest problems:", err);
        } finally {
            setLoadingSheet(false);
        }
    }, [user, onSheetLoaded]);

    /* ─── URL submit handler ─── */
    const handleUrlSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const parsed = parseCodeforcesUrl(urlInput.trim());
        if (!parsed) return;

        if (parsed.isSheet) {
            // Load entire contest
            await loadContestProblems(
                parsed.contestId,
                parsed.type === "gym" ? "gym" : parsed.type === "group" ? "group" : "contest",
                parsed.groupId
            );
            // Update loaded ref so we don't re-fetch
            loadedContestRef.current = parsed.contestId;
            setUrlInput("");
        } else {
            // Navigate to single problem
            const route = getInternalRoute(parsed);
            router.push(route);
            onClose();
        }
    };

    const parsedUrl = parseCodeforcesUrl(urlInput.trim());

    /* ─── Filter problems ─── */
    const filteredProblems = sheet?.problems.filter((p) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            p.index.toLowerCase().includes(q) ||
            p.name.toLowerCase().includes(q) ||
            (p.tags || []).some((t) => t.toLowerCase().includes(q))
        );
    }) ?? [];

    /* ─── Navigate to problem ─── */
    const navigateToProblem = (problem: SheetProblem) => {
        if (!sheet) return;

        // If we're in a curriculum sheet, use the curriculum route
        if (levelSlug && sheetSlug) {
            router.push(`/dashboard/sheets/${levelSlug}/${sheetSlug}/${problem.index}`);
        } else {
            const baseUrl = getNavigationBaseUrl(
                sheet.contestId,
                sheet.contestType,
                sheet.groupId
            );
            router.push(`${baseUrl}/${problem.index}`);
        }
        onClose();
    };

    /* ─── Progress ─── */
    const totalProblems = sheet?.problems.length ?? 0;
    const solvedCount = solvedSet.size;
    const progressPct = totalProblems > 0 ? (solvedCount / totalProblems) * 100 : 0;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <Backdrop onClick={onClose} />
                    <motion.div
                        initial={{ x: "-100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "-100%" }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        className="fixed left-0 top-0 bottom-0 w-[380px] max-w-[85vw] bg-[#0f0f0f] border-r border-white/8 z-[999] flex flex-col shadow-2xl"
                    >
                        {/* ─── Header ─── */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 shrink-0">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-[#E8C15A] animate-pulse" />
                                <h2 className="text-sm font-semibold text-white/90 flex items-center gap-2">
                                    Problem List
                                    <span className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[9px] font-mono text-white/20">Alt + P</span>
                                </h2>
                                {sheet && (
                                    <span className="text-[10px] text-white/40 font-mono ml-1">
                                        #{sheet.contestId}
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={onClose}
                                className="p-1.5 text-white/40 hover:text-white hover:bg-white/5 rounded-md transition-all"
                            >
                                <X size={16} />
                            </button>
                        </div>



                        {/* ─── Search ─── */}
                        {sheet && sheet.problems.length > 0 && (
                            <div className="px-3 pb-2 shrink-0">
                                <div className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-1.5">
                                    <Search size={13} className="text-white/30 shrink-0" />
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Search problems..."
                                        className="flex-1 bg-transparent text-xs text-white placeholder:text-white/20 focus:outline-none"
                                    />
                                    {search && (
                                        <button
                                            onClick={() => setSearch("")}
                                            className="text-white/30 hover:text-white/60"
                                        >
                                            <X size={12} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ─── Progress Bar ─── */}
                        {sheet && sheet.problems.length > 0 && (
                            <div className="px-4 pb-2 shrink-0">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] text-white/30 uppercase tracking-wider font-medium">
                                        Progress
                                    </span>
                                    <span className="text-[10px] text-white/40 font-mono">
                                        {solvedCount}/{totalProblems}
                                    </span>
                                </div>
                                <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-[#E8C15A]/60 transition-all duration-500"
                                        style={{ width: `${progressPct}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* ─── Problem List ─── */}
                        <div className="flex-1 overflow-y-auto px-2 pb-3 min-h-0">
                            {loadingSheet || loadingPersisted ? (
                                <div className="flex items-center justify-center py-16">
                                    <Loader2 size={24} className="animate-spin text-white/20" />
                                </div>
                            ) : !sheet || sheet.problems.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-3">
                                        <LinkIcon size={20} className="text-white/20" />
                                    </div>
                                    <p className="text-sm text-white/40 mb-1">No sheet loaded</p>
                                    <p className="text-[11px] text-white/20">
                                        Paste a Codeforces contest link above to load problems
                                    </p>
                                </div>
                            ) : filteredProblems.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <p className="text-xs text-white/30">No problems match &quot;{search}&quot;</p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-0.5 mt-1">
                                    {filteredProblems.map((problem) => {
                                        const isCurrent =
                                            String(problem.contestId) === currentContestId &&
                                            problem.index.toUpperCase() === currentProblemId.toUpperCase();
                                        const isSolved = solvedSet.has(`${problem.contestId}-${problem.index}`);
                                        const diff = getDifficultyColor(problem.rating);

                                        const href = levelSlug && sheetSlug
                                            ? `/dashboard/sheets/${levelSlug}/${sheetSlug}/${problem.index}`
                                            : `${getNavigationBaseUrl(String(problem.contestId), "contest")}/${problem.index}`;

                                        return (
                                            <Link
                                                key={`${problem.contestId}-${problem.index}`}
                                                href={href}
                                                onClick={onClose}
                                                className={`
                                                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all group
                                                    ${isCurrent
                                                        ? "bg-[#E8C15A]/10 border border-[#E8C15A]/20"
                                                        : "hover:bg-white/[0.04] border border-transparent"
                                                    }
                                                `}
                                            >
                                                {/* Index badge */}
                                                <div className={`
                                                    w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold font-mono shrink-0 transition-colors
                                                    ${isCurrent
                                                        ? "bg-[#E8C15A]/20 text-[#E8C15A]"
                                                        : "bg-white/5 text-white/50 group-hover:bg-white/8 group-hover:text-white/70"
                                                    }
                                                `}>
                                                    {problem.index}
                                                </div>

                                                {/* Problem info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className={`text-xs truncate ${isCurrent ? "text-white" : "text-white/70 group-hover:text-white/90"
                                                            }`}>
                                                            {problem.name}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        {/* Difficulty pill */}
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${diff.bg} ${diff.text} font-medium`}>
                                                            {problem.rating ? `${problem.rating}` : "?"}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Status icon */}
                                                <div className="shrink-0">
                                                    {isSolved ? (
                                                        <CheckCircle2 size={15} className="text-[#E8C15A]" />
                                                    ) : isCurrent ? (
                                                        <ChevronRight size={15} className="text-[#E8C15A]" />
                                                    ) : (
                                                        <Circle size={15} className="text-white/10 group-hover:text-white/20" />
                                                    )}
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* ─── Footer ─── */}
                        {sheet && (
                            <div className="px-4 py-2.5 border-t border-white/8 shrink-0">
                                <p className="text-[10px] text-white/20 text-center font-mono">
                                    {sheet.contestType === "gym" ? "Gym" : "Contest"} {sheet.contestId}
                                    {" \u00B7 "}{sheet.problems.length} problems
                                </p>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
