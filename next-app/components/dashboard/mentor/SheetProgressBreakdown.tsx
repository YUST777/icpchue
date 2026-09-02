'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, ChevronDown, ChevronRight, CheckCircle2, Clock, Circle } from 'lucide-react';

interface SheetProblem {
    id: number | string;
    problem_letter: string;
    title: string;
    contest_id?: string;
    rating?: number;
    status: 'SOLVED' | 'ATTEMPTED' | 'NOT_STARTED';
}

interface SheetProgressItem {
    id: number | string;
    sheet_number?: number;
    sheet_letter: string;
    name: string;
    level_name?: string;
    total_problems: number;
    solved: number;
    attempted: number;
    not_started: number;
    progress_percentage: number;
    problems?: SheetProblem[];
}

interface SheetProgressBreakdownProps {
    sheets: SheetProgressItem[];
}

export function SheetProgressBreakdown({ sheets }: SheetProgressBreakdownProps) {
    const [expandedSheetId, setExpandedSheetId] = useState<number | string | null>(null);

    const toggleSheet = (id: number | string) => {
        setExpandedSheetId(expandedSheetId === id ? null : id);
    };

    return (
        <div className="bg-[#121214]/90 border border-white/[0.08] rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/[0.06]">
                <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-[#E8C15A]/10 text-[#E8C15A] flex items-center justify-center">
                        <BookOpen size={13} />
                    </div>
                    <h2 className="text-xs font-semibold text-white/90 tracking-tight">Sheet Progress Matrix</h2>
                </div>
                <span className="text-[11px] text-white/40 font-mono">{sheets.length} Sheets</span>
            </div>

            {/* Hidden scrollbar container */}
            <div className="overflow-y-auto max-h-[300px] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden flex-1 space-y-1.5">
                {sheets.map((sheet, index) => {
                    const isExpanded = expandedSheetId === (sheet.id || index);
                    const solvedPct = Math.min(100, Math.round((sheet.solved / (sheet.total_problems || 1)) * 100));
                    const attemptedPct = Math.min(100, Math.round((sheet.attempted / (sheet.total_problems || 1)) * 100));

                    return (
                        <div 
                            key={sheet.id || index} 
                            className="rounded-xl border border-white/[0.06] bg-white/[0.015] overflow-hidden transition-all"
                        >
                            {/* Sheet Summary Row */}
                            <div 
                                onClick={() => toggleSheet(sheet.id || index)}
                                className="px-3 py-2.5 flex items-center justify-between cursor-pointer hover:bg-white/[0.03] active:bg-white/[0.05] transition-colors"
                            >
                                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                    <div className="w-4 h-4 flex items-center justify-center text-white/40">
                                        {isExpanded ? (
                                            <ChevronDown size={13} className="text-[#E8C15A]" />
                                        ) : (
                                            <ChevronRight size={13} />
                                        )}
                                    </div>
                                    <div className="truncate text-xs">
                                        <span className="font-bold text-[#E8C15A] mr-2">{sheet.sheet_letter}</span>
                                        <span className="text-white/85 font-medium">{sheet.name.replace(/^Sheet #\d+\s*\((.*)\)$/, '$1')}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                    <div className="text-[11px] font-mono text-white/45">
                                        <strong className="text-[#E8C15A] font-semibold">{sheet.solved}</strong>
                                        <span>/{sheet.total_problems}</span>
                                    </div>
                                    <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden flex">
                                        {solvedPct > 0 && (
                                            <div style={{ width: `${solvedPct}%` }} className="h-full bg-[#E8C15A] rounded-l-full" />
                                        )}
                                        {attemptedPct > 0 && (
                                            <div style={{ width: `${attemptedPct}%` }} className="h-full bg-amber-400" />
                                        )}
                                    </div>
                                    <span className="text-[11px] font-mono font-semibold text-white/80 w-8 text-right">
                                        {solvedPct}%
                                    </span>
                                </div>
                            </div>

                            {/* Dropdown Problems View with spring animation */}
                            <AnimatePresence>
                                {isExpanded && sheet.problems && sheet.problems.length > 0 && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="p-2.5 bg-black/40 border-t border-white/[0.06] grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                            {sheet.problems.map((p) => {
                                                const isSolved = p.status === 'SOLVED';
                                                const isAttempted = p.status === 'ATTEMPTED';

                                                return (
                                                    <div 
                                                        key={p.id}
                                                        className={`px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between border transition-all ${
                                                            isSolved
                                                                ? 'bg-[#E8C15A]/10 border-[#E8C15A]/25 text-white'
                                                                : isAttempted
                                                                ? 'bg-amber-500/10 border-amber-500/25 text-white/90'
                                                                : 'bg-white/[0.02] border-white/[0.04] text-white/40'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2 truncate pr-1">
                                                            {isSolved ? (
                                                                <CheckCircle2 size={11} className="text-[#E8C15A] shrink-0" />
                                                            ) : isAttempted ? (
                                                                <Clock size={11} className="text-amber-400 shrink-0" />
                                                            ) : (
                                                                <Circle size={9} className="text-white/20 shrink-0" />
                                                            )}
                                                            <span className="font-mono font-semibold text-[#E8C15A] text-xs">{p.problem_letter}.</span>
                                                            <span className="truncate text-xs font-medium">{p.title}</span>
                                                        </div>
                                                        <span className={`text-[9px] font-mono uppercase shrink-0 ${
                                                            isSolved ? 'text-[#E8C15A] font-semibold' : isAttempted ? 'text-amber-400 font-semibold' : 'text-white/30'
                                                        }`}>
                                                            {isSolved ? 'Solved' : isAttempted ? 'Attempted' : 'Left'}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
