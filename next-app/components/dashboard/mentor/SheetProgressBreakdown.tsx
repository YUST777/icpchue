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
        <div className="bg-[#121214] border border-white/[0.08] rounded-xl p-3.5 shadow-md flex flex-col h-full">
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <div className="p-1 rounded bg-[#E8C15A]/10 text-[#E8C15A]">
                        <BookOpen size={14} />
                    </div>
                    <h2 className="text-xs font-bold text-white tracking-wider uppercase">Sheet Progress Matrix</h2>
                </div>
                <span className="text-[10px] text-white/40 font-medium">{sheets.length} Sheets</span>
            </div>

            <div className="overflow-y-auto max-h-[260px] scrollbar-thin flex-1">
                <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-[#121214] z-10">
                        <tr className="text-white/40 border-b border-white/5 font-semibold text-[10px] uppercase">
                            <th className="pb-2 pl-1">Sheet</th>
                            <th className="pb-2 text-center">Solved</th>
                            <th className="pb-2 text-center">Att.</th>
                            <th className="pb-2 text-center">Left</th>
                            <th className="pb-2 pr-1 text-right">Progress</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                        {sheets.map((sheet, index) => {
                            const solvedPct = Math.min(100, Math.round((sheet.solved / (sheet.total_problems || 1)) * 100));
                            const attemptedPct = Math.min(100, Math.round((sheet.attempted / (sheet.total_problems || 1)) * 100));

                            return (
                                <tr key={sheet.id || index} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="py-2 pl-1 text-[11px] font-medium text-white truncate max-w-[160px]">
                                        <span className="font-bold text-[#E8C15A] mr-1.5">{sheet.sheet_letter}</span>
                                        <span className="text-white/80">{sheet.name.replace(/^Sheet #\d+\s*\((.*)\)$/, '$1')}</span>
                                    </td>
                                    <td className="py-2 text-center font-bold text-[#E8C15A] text-[11px]">
                                        {sheet.solved}
                                    </td>
                                    <td className="py-2 text-center font-medium text-amber-400 text-[11px]">
                                        {sheet.attempted}
                                    </td>
                                    <td className="py-2 text-center font-medium text-white/40 text-[11px]">
                                        {sheet.not_started}
                                    </td>
                                    <td className="py-2 pr-1 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden flex shrink-0">
                                                {solvedPct > 0 && (
                                                    <div 
                                                        style={{ width: `${solvedPct}%` }} 
                                                        className="h-full bg-[#E8C15A] rounded-l-full shadow-[0_0_4px_rgba(232,193,90,0.5)]"
                                                    />
                                                )}
                                                {attemptedPct > 0 && (
                                                    <div 
                                                        style={{ width: `${attemptedPct}%` }} 
                                                        className="h-full bg-amber-400/80"
                                                    />
                                                )}
                                            </div>
                                            <span className="text-[10px] font-bold text-white/80 w-7 text-right">
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
