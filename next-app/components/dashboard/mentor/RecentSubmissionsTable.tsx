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
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 size={10} /> Accepted
                </span>
            );
        }
        if (lower.includes('wrong') || lower.includes('wa')) {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                    <XCircle size={10} /> Wrong Answer
                </span>
            );
        }
        if (lower.includes('time') || lower.includes('tle')) {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Clock size={10} /> Time Limit
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <AlertTriangle size={10} /> {verdict}
            </span>
        );
    };

    return (
        <div className="bg-[#121214] border border-white/[0.08] rounded-2xl p-5 shadow-xl backdrop-blur-md flex flex-col h-full">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                        <FileCode2 size={16} />
                    </div>
                    <h2 className="text-base font-bold text-white tracking-tight">Recent Submissions</h2>
                </div>
                <span className="text-xs text-white/40 font-medium">Last {submissions.length}</span>
            </div>

            <div className="overflow-x-auto scrollbar-hide flex-1">
                <table className="w-full text-left text-xs border-collapse">
                    <thead>
                        <tr className="text-white/40 border-b border-white/5 font-semibold text-[11px] uppercase tracking-wider">
                            <th className="pb-3 pl-1">Problem</th>
                            <th className="pb-3 text-center">Sheet</th>
                            <th className="pb-3 text-left">Verdict</th>
                            <th className="pb-3 text-center">Lang</th>
                            <th className="pb-3 text-center">Time</th>
                            <th className="pb-3 pr-1 text-right">Attempt</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                        {submissions.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="py-8 text-center text-white/40">
                                    No submissions recorded yet.
                                </td>
                            </tr>
                        ) : (
                            submissions.slice(0, 8).map((sub) => (
                                <tr 
                                    key={sub.id} 
                                    onClick={() => onSelectSubmission?.(sub)}
                                    className="hover:bg-white/[0.04] transition-colors cursor-pointer group"
                                >
                                    <td className="py-2.5 pl-1 font-semibold text-white group-hover:text-[#E8C15A] transition-colors">
                                        <div className="truncate max-w-[140px] md:max-w-[180px]">
                                            {sub.problem}
                                        </div>
                                    </td>
                                    <td className="py-2.5 text-center text-white/60 font-mono text-[11px]">
                                        {sub.sheet_id ? `Sheet ${sub.sheet_id}` : '-'}
                                    </td>
                                    <td className="py-2.5">
                                        {getVerdictBadge(sub.verdict)}
                                    </td>
                                    <td className="py-2.5 text-center text-white/50 text-[11px]">
                                        {sub.language.split(' ')[0]}
                                    </td>
                                    <td className="py-2.5 text-center text-white/60 font-mono text-[11px]">
                                        {sub.time_ms !== null && sub.time_ms !== undefined ? `${sub.time_ms} ms` : '-'}
                                    </td>
                                    <td className="py-2.5 pr-1 text-right font-bold text-white/80">
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
