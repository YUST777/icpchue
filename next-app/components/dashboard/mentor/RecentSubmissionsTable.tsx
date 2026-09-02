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
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 size={9} /> AC
                </span>
            );
        }
        if (lower.includes('wrong') || lower.includes('wa')) {
            return (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                    <XCircle size={9} /> WA
                </span>
            );
        }
        if (lower.includes('time') || lower.includes('tle')) {
            return (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Clock size={9} /> TLE
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <AlertTriangle size={9} /> {verdict.slice(0, 4)}
            </span>
        );
    };

    return (
        <div className="bg-[#121214] border border-white/[0.08] rounded-xl p-3.5 shadow-md flex flex-col h-full">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/5">
                <div className="flex items-center gap-1.5">
                    <div className="p-1 rounded bg-blue-500/10 text-blue-400">
                        <FileCode2 size={14} />
                    </div>
                    <h2 className="text-xs font-bold text-white tracking-tight uppercase">Recent Submissions Feed</h2>
                </div>
                <span className="text-[10px] text-white/40 font-medium">{submissions.length} Recorded</span>
            </div>

            <div className="overflow-y-auto max-h-[220px] scrollbar-thin flex-1">
                <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-[#121214] z-10">
                        <tr className="text-white/40 border-b border-white/5 font-semibold text-[10px] uppercase">
                            <th className="pb-1.5 pl-1">Problem</th>
                            <th className="pb-1.5 text-center">Verdict</th>
                            <th className="pb-1.5 text-center">Lang</th>
                            <th className="pb-1.5 text-center">Time</th>
                            <th className="pb-1.5 pr-1 text-right">Att.</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                        {submissions.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="py-4 text-center text-white/40 text-[11px]">
                                    No submissions recorded.
                                </td>
                            </tr>
                        ) : (
                            submissions.map((sub) => (
                                <tr 
                                    key={sub.id} 
                                    onClick={() => onSelectSubmission?.(sub)}
                                    className="hover:bg-white/[0.04] transition-colors cursor-pointer group"
                                >
                                    <td className="py-1.5 pl-1 font-semibold text-white group-hover:text-[#E8C15A] transition-colors text-[11px] truncate max-w-[130px]">
                                        {sub.problem}
                                    </td>
                                    <td className="py-1.5 text-center">
                                        {getVerdictBadge(sub.verdict)}
                                    </td>
                                    <td className="py-1.5 text-center text-white/50 text-[10px]">
                                        {sub.language.split(' ')[0]}
                                    </td>
                                    <td className="py-1.5 text-center text-white/60 font-mono text-[10px]">
                                        {sub.time_ms !== null && sub.time_ms !== undefined ? `${sub.time_ms}ms` : '-'}
                                    </td>
                                    <td className="py-1.5 pr-1 text-right font-bold text-white/80 text-[10px]">
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
