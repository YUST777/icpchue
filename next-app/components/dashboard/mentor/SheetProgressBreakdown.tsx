'use client';

import React from 'react';
import { BookOpen } from 'lucide-react';

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
}

interface SheetProgressBreakdownProps {
    sheets: SheetProgressItem[];
}

export function SheetProgressBreakdown({ sheets }: SheetProgressBreakdownProps) {
    return (
        <div className="bg-[#121214] border border-white/[0.08] rounded-2xl p-5 shadow-xl backdrop-blur-md flex flex-col h-full">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-[#E8C15A]/10 text-[#E8C15A]">
                        <BookOpen size={16} />
                    </div>
                    <h2 className="text-base font-bold text-white tracking-tight">Sheet Progress Overview</h2>
                </div>
                <span className="text-xs text-white/40 font-medium">{sheets.length} Sheets</span>
            </div>

            <div className="overflow-x-auto scrollbar-hide flex-1">
                <table className="w-full text-left text-xs border-collapse">
                    <thead>
                        <tr className="text-white/40 border-b border-white/5 font-semibold text-[11px] uppercase tracking-wider">
                            <th className="pb-3 pl-1">Sheet</th>
                            <th className="pb-3 text-center">Solved</th>
                            <th className="pb-3 text-center">Attempted</th>
                            <th className="pb-3 text-center">Not Started</th>
                            <th className="pb-3 pr-1 text-right min-w-[120px]">Progress</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                        {sheets.map((sheet, index) => {
                            const solvedPct = Math.min(100, Math.round((sheet.solved / (sheet.total_problems || 1)) * 100));
                            const attemptedPct = Math.min(100, Math.round((sheet.attempted / (sheet.total_problems || 1)) * 100));

                            return (
                                <tr key={sheet.id || index} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="py-2.5 pl-1 font-medium text-white group-hover:text-[#E8C15A] transition-colors">
                                        <div className="truncate max-w-[160px] md:max-w-[200px]">
                                            <span className="font-bold text-[#E8C15A] mr-1.5">{sheet.sheet_letter}</span>
                                            <span className="text-white/80">{sheet.name.replace(/^Sheet #\d+\s*\((.*)\)$/, '$1')}</span>
                                        </div>
                                    </td>
                                    <td className="py-2.5 text-center font-semibold text-emerald-400">
                                        {sheet.solved}
                                    </td>
                                    <td className="py-2.5 text-center font-medium text-amber-400">
                                        {sheet.attempted}
                                    </td>
                                    <td className="py-2.5 text-center font-medium text-red-400/80">
                                        {sheet.not_started}
                                    </td>
                                    <td className="py-2.5 pr-1 text-right">
                                        <div className="flex items-center justify-end gap-2.5">
                                            <div className="w-20 md:w-28 h-2 bg-white/10 rounded-full overflow-hidden flex shrink-0">
                                                {solvedPct > 0 && (
                                                    <div 
                                                        style={{ width: `${solvedPct}%` }} 
                                                        className="h-full bg-emerald-400 transition-all duration-500 rounded-l-full"
                                                    />
                                                )}
                                                {attemptedPct > 0 && (
                                                    <div 
                                                        style={{ width: `${attemptedPct}%` }} 
                                                        className="h-full bg-amber-400 transition-all duration-500"
                                                    />
                                                )}
                                            </div>
                                            <span className="text-[11px] font-bold text-white/80 w-8 text-right">
                                                {solvedPct}%
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
