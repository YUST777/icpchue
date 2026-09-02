'use client';

import React, { useState } from 'react';
import { 
    FileCode2, Clock, CheckCircle2, XCircle, AlertTriangle, 
    X, Copy, Check, ExternalLink, Cpu, HardDrive
} from 'lucide-react';
import { SiCodeforces } from 'react-icons/si';

interface SubmissionItem {
    id: number;
    problem: string;
    problem_title?: string;
    contest_id?: string;
    problem_index?: string;
    sheet_id?: string;
    sheet_info?: { level: string; sheet_letter: string; sheet_name: string };
    verdict: string;
    language: string;
    time_ms?: number | null;
    memory_kb?: number | null;
    attempts: number;
    submitted_at: string;
    cf_submission_id?: string;
    source_code?: string;
}

interface RecentSubmissionsTableProps {
    submissions: SubmissionItem[];
    onLoadMore?: () => void;
    hasMore?: boolean;
    loadingMore?: boolean;
}

export function RecentSubmissionsTable({ 
    submissions, 
    onLoadMore, 
    hasMore = false, 
    loadingMore = false 
}: RecentSubmissionsTableProps) {
    const [activeSubModal, setActiveSubModal] = useState<SubmissionItem | null>(null);
    const [copied, setCopied] = useState(false);

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

    const handleCopy = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const formatDate = (isoStr: string) => {
        const d = new Date(isoStr);
        return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
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
                <span className="text-[10px] text-white/40 font-medium">Showing {submissions.length} Submissions</span>
            </div>

            {/* Submissions Table with hidden browser scrollbar */}
            <div className="overflow-y-auto max-h-[300px] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden flex-1">
                <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-[#121214] z-10">
                        <tr className="text-white/40 border-b border-white/5 font-semibold text-[10px] uppercase">
                            <th className="pb-2 pl-1">Problem</th>
                            <th className="pb-2 text-center">Curriculum</th>
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
                                    onClick={() => setActiveSubModal(sub)}
                                    className="hover:bg-white/[0.04] transition-colors cursor-pointer group"
                                    title="Click to view full submission code & details"
                                >
                                    <td className="py-2 pl-1 font-semibold text-white group-hover:text-[#E8C15A] transition-colors text-[11px] truncate max-w-[150px]">
                                        {sub.problem}
                                    </td>
                                    <td className="py-2 text-center text-white/60 font-mono text-[10px]">
                                        {sub.sheet_info ? `${sub.sheet_info.level} / Sheet ${sub.sheet_info.sheet_letter}` : (sub.sheet_id ? `Sheet ${sub.sheet_id}` : '-')}
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

                {/* Load More Button */}
                {hasMore && (
                    <div className="p-2 text-center border-t border-white/5">
                        <button
                            onClick={onLoadMore}
                            disabled={loadingMore}
                            className="px-3 py-1 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-lg text-xs font-semibold transition-all border border-white/5 disabled:opacity-50"
                        >
                            {loadingMore ? 'Loading next 100...' : 'Load Next 100 Submissions'}
                        </button>
                    </div>
                )}
            </div>

            {/* Submission Code & Detail Modal */}
            {activeSubModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-[#121214] border border-white/15 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
                        {/* Modal Header */}
                        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-lg bg-[#E8C15A]/10 text-[#E8C15A]">
                                    <FileCode2 size={18} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-bold text-white">{activeSubModal.problem}</h3>
                                        {getVerdictBadge(activeSubModal.verdict)}
                                    </div>
                                    <span className="text-[11px] text-white/50">
                                        {activeSubModal.problem_title ? `${activeSubModal.problem_title} • ` : ''}
                                        {formatDate(activeSubModal.submitted_at)}
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={() => setActiveSubModal(null)}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Diagnostics Stat Row */}
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 p-3 bg-black/40 border-b border-white/5 text-xs">
                            <div className="bg-white/5 p-2 rounded-lg">
                                <span className="text-white/40 block text-[9px] uppercase">Language</span>
                                <span className="font-semibold text-white mt-0.5 block">{activeSubModal.language}</span>
                            </div>
                            <div className="bg-white/5 p-2 rounded-lg">
                                <span className="text-white/40 block text-[9px] uppercase">Execution Time</span>
                                <div className="flex items-center gap-1 font-semibold text-white mt-0.5">
                                    <Cpu size={12} className="text-blue-400" />
                                    <span>{activeSubModal.time_ms ?? 0} ms</span>
                                </div>
                            </div>
                            <div className="bg-white/5 p-2 rounded-lg">
                                <span className="text-white/40 block text-[9px] uppercase">Memory</span>
                                <div className="flex items-center gap-1 font-semibold text-white mt-0.5">
                                    <HardDrive size={12} className="text-purple-400" />
                                    <span>{activeSubModal.memory_kb ? `${(activeSubModal.memory_kb / 1024).toFixed(1)} MB` : '-'}</span>
                                </div>
                            </div>
                            <div className="bg-white/5 p-2 rounded-lg flex flex-col justify-between">
                                <span className="text-white/40 block text-[9px] uppercase">Codeforces</span>
                                {activeSubModal.cf_submission_id ? (
                                    <a
                                        href={`https://codeforces.com/group/MWSDmqGsZm/contest/${activeSubModal.contest_id}/submission/${activeSubModal.cf_submission_id}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-[#E8C15A] hover:underline flex items-center gap-1 font-semibold text-[11px]"
                                    >
                                        <SiCodeforces size={11} className="text-red-400" />
                                        <span>#{activeSubModal.cf_submission_id}</span>
                                        <ExternalLink size={9} />
                                    </a>
                                ) : (
                                    <span className="text-white/50 text-[11px]">Platform</span>
                                )}
                            </div>
                        </div>

                        {/* Source Code Box */}
                        <div className="p-3 flex-1 flex flex-col bg-[#0B0B0C] overflow-hidden min-h-[260px]">
                            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/5 text-xs">
                                <span className="text-white/50 text-[11px] font-mono">Source Code</span>
                                <button
                                    onClick={() => handleCopy(activeSubModal.source_code || '')}
                                    className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all text-xs flex items-center gap-1.5"
                                >
                                    {copied ? <Check size={12} className="text-[#E8C15A]" /> : <Copy size={12} />}
                                    <span>{copied ? 'Copied' : 'Copy Code'}</span>
                                </button>
                            </div>

                            <div className="font-mono text-xs overflow-auto flex-1 p-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                                {activeSubModal.source_code ? (
                                    <div className="flex text-white/90">
                                        <div className="select-none text-white/25 text-right pr-3 border-r border-white/10 space-y-0.5 shrink-0">
                                            {activeSubModal.source_code.split('\n').map((_, i) => (
                                                <div key={i}>{i + 1}</div>
                                            ))}
                                        </div>
                                        <div className="pl-3 space-y-0.5 whitespace-pre flex-1 text-[#E0E0E0]">
                                            {activeSubModal.source_code.split('\n').map((line, i) => (
                                                <div key={i} className="hover:bg-white/[0.03]">
                                                    {line || '\n'}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-white/30 text-xs">
                                        No source code recorded for this submission.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
