'use client';

import React from 'react';
import { FileCode2, Clock, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

interface SubmissionItem {
    id: number;
    problem: string;
    contest_id?: string;
    problem_index?: string;
    sheet_id?: string;
    verdict: string;
    language: string;
    time_ms?: number | null;
    memory_kb?: number | null;
    attempts: number;
    submitted_at: string;
    source_code?: string;
}

interface RecentSubmissionsTableProps {
    submissions: SubmissionItem[];
    onSelectSubmission?: (sub: SubmissionItem) => void;
}

export function RecentSubmissionsTable({ submissions, onSelectSubmission }: RecentSubmissionsTableProps) {
    const getVerdictBadge = (verdict: string) => {
        const lower = verdict.toLowerCase();
        if (lower.includes('accepted') || lower === 'ac' || lower === 'ok') {
            return (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#E8C15A]/15 text-[#E8C15A] border border-[#E8C15A]/30">
                    <CheckCircle2 size={10} /> Accepted
                </span>
            );
        }
        if (lower.includes('wrong') || lower.includes('wa')) {
            return (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/30">
                    <XCircle size={10} /> Wrong Answer
                </span>
            );
        }
        if (lower.includes('time') || lower.includes('tle')) {
            return (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    <Clock size={10} /> Time Limit
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
                <AlertTriangle size={10} /> {verdict}
            </span>
        );
    };

    return (
        <div className="bg-[#121214] border border-white/[0.08] rounded-xl p-3.5 shadow-md flex flex-col h-full">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <div className="p-1 rounded bg-[#E8C15A]/10 text-[#E8C15A]">
                        <FileCode2 size={14} />
                    </div>
                    <h2 className="text-xs font-bold text-white tracking-wider uppercase">Recent Submissions Feed</h2>
                </div>
                <span className="text-[10px] text-white/40 font-medium">Last {submissions.length} Submissions</span>
            </div>

            <div className="overflow-y-auto max-h-[280px] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden flex-1">
                <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-[#121214] z-10">
                        <tr className="text-white/40 border-b border-white/5 font-semibold text-[10px] uppercase">
                            <th className="pb-2 pl-1">Problem</th>
                            <th className="pb-2 text-center">Sheet</th>
                            <th className="pb-2 text-left">Verdict</th>
                            <th className="pb-2 text-center">Lang</th>
                            <th className="pb-2 text-center">Time</th>
                            <th className="pb-2 pr-1 text-right">Attempt</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                        {submissions.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="py-6 text-center text-white/40 text-xs">
                                    No submissions recorded yet.
                                </td>
                            </tr>
                        ) : (
                            submissions.map((sub) => (
                                <tr 
                                    key={sub.id} 
                                    onClick={() => onSelectSubmission?.(sub)}
                                    className="hover:bg-white/[0.04] transition-colors cursor-pointer group"
                                >
                                    <td className="py-2 pl-1 font-semibold text-white group-hover:text-[#E8C15A] transition-colors text-[11px] truncate max-w-[150px]">
                                        {sub.problem}
                                    </td>
                                    <td className="py-2 text-center text-white/60 font-mono text-[10px]">
                                        {sub.sheet_id ? `Sheet ${sub.sheet_id}` : '-'}
                                    </td>
                                    <td className="py-2">
                                        {getVerdictBadge(sub.verdict)}
                                    </td>
                                    <td className="py-2 text-center text-white/50 text-[10px]">
                                        {sub.language.split(' ')[0]}
                                    </td>
                                    <td className="py-2 text-center text-white/60 font-mono text-[10px]">
                                        {sub.time_ms !== null && sub.time_ms !== undefined ? `${sub.time_ms}ms` : '-'}
                                    </td>
                                    <td className="py-2 pr-1 text-right font-bold text-white/80 text-[11px]">
                                        #{sub.attempts || 1}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
