'use client';

import React, { useState } from 'react';
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
        <div className="bg-[#121214] border border-white/[0.08] rounded-xl p-3.5 shadow-md flex flex-col h-full">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <div className="p-1 rounded bg-[#E8C15A]/10 text-[#E8C15A]">
                        <BookOpen size={14} />
                    </div>
                    <h2 className="text-xs font-bold text-white tracking-wider uppercase">Sheet Progress Matrix</h2>
                </div>
                <span className="text-[10px] text-white/40 font-medium">{sheets.length} Sheets</span>
            </div>

            {/* Hidden scrollbar container */}
            <div className="overflow-y-auto max-h-[280px] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden flex-1 space-y-1">
                {sheets.map((sheet, index) => {
                    const isExpanded = expandedSheetId === (sheet.id || index);
                    const solvedPct = Math.min(100, Math.round((sheet.solved / (sheet.total_problems || 1)) * 100));
                    const attemptedPct = Math.min(100, Math.round((sheet.attempted / (sheet.total_problems || 1)) * 100));

                    return (
                        <div key={sheet.id || index} className="rounded-lg border border-white/5 bg-white/[0.01] overflow-hidden transition-all">
                            {/* Sheet Summary Row */}
                            <div 
                                onClick={() => toggleSheet(sheet.id || index)}
                                className="px-2.5 py-2 flex items-center justify-between cursor-pointer hover:bg-white/[0.03] transition-colors"
                            >
                                <div className="flex items-center gap-2 min-w-0 pr-2">
                                    {isExpanded ? (
                                        <ChevronDown size={13} className="text-[#E8C15A] shrink-0" />
                                    ) : (
                                        <ChevronRight size={13} className="text-white/30 shrink-0" />
                                    )}
                                    <div className="truncate text-xs">
                                        <span className="font-bold text-[#E8C15A] mr-1.5">{sheet.sheet_letter}</span>
                                        <span className="text-white/80 font-medium">{sheet.name.replace(/^Sheet #\d+\s*\((.*)\)$/, '$1')}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                    <div className="text-[10px] text-white/50">
                                        <strong className="text-[#E8C15A] font-bold">{sheet.solved}</strong>
                                        <span>/{sheet.total_problems}</span>
                                    </div>
                                    <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden flex">
                                        {solvedPct > 0 && (
                                            <div style={{ width: `${solvedPct}%` }} className="h-full bg-[#E8C15A]" />
                                        )}
                                        {attemptedPct > 0 && (
                                            <div style={{ width: `${attemptedPct}%` }} className="h-full bg-amber-400" />
                                        )}
                                    </div>
                                    <span className="text-[10px] font-bold text-white/80 w-7 text-right">
                                        {solvedPct}%
                                    </span>
                                </div>
                            </div>

                            {/* Dropdown Problems View */}
                            {isExpanded && sheet.problems && sheet.problems.length > 0 && (
                                <div className="p-2.5 bg-black/40 border-t border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-1.5 animate-fadeIn">
                                    {sheet.problems.map((p) => {
                                        const isSolved = p.status === 'SOLVED';
                                        const isAttempted = p.status === 'ATTEMPTED';

                                        return (
                                            <div 
                                                key={p.id}
                                                className={`px-2 py-1 rounded text-xs flex items-center justify-between border ${
                                                    isSolved
                                                        ? 'bg-[#E8C15A]/10 border-[#E8C15A]/30 text-white'
                                                        : isAttempted
                                                        ? 'bg-amber-500/10 border-amber-500/30 text-white/90'
                                                        : 'bg-white/[0.02] border-white/5 text-white/40'
                                                }`}
                                            >
                                                <div className="flex items-center gap-1.5 truncate pr-1">
                                                    {isSolved ? (
                                                        <CheckCircle2 size={11} className="text-[#E8C15A] shrink-0" />
                                                    ) : isAttempted ? (
                                                        <Clock size={11} className="text-amber-400 shrink-0" />
                                                    ) : (
                                                        <Circle size={10} className="text-white/20 shrink-0" />
                                                    )}
                                                    <span className="font-bold text-[#E8C15A] text-[11px]">{p.problem_letter}.</span>
                                                    <span className="truncate text-[11px] font-medium">{p.title}</span>
                                                </div>
                                                <span className={`text-[9px] font-bold uppercase shrink-0 ${
                                                    isSolved ? 'text-[#E8C15A]' : isAttempted ? 'text-amber-400' : 'text-white/30'
                                                }`}>
                                                    {isSolved ? 'Solved' : isAttempted ? 'Attempted' : 'Left'}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
