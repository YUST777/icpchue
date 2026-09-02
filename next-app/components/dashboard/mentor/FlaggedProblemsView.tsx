'use client';

import React from 'react';
import { ShieldAlert, AlertTriangle, ExternalLink, Clock, Copy, Code, CheckCircle2 } from 'lucide-react';
import { SiCodeforces } from 'react-icons/si';

interface FlaggedProblemItem {
    submission_id: number;
    contest_id: string;
    problem_index: string;
    problem_title: string;
    verdict: string;
    reason: string;
    submitted_at: string;
    time_to_solve_seconds?: number;
    paste_events?: number;
    cf_submission_id?: string;
    source_code?: string;
}

interface FlaggedProblemsViewProps {
    flaggedProblems: FlaggedProblemItem[];
    totalFlags: number;
    isShadowBanned: boolean;
    cfHandle?: string;
}

export function FlaggedProblemsView({
    flaggedProblems = [],
    totalFlags = 0,
    isShadowBanned = false,
    cfHandle = '',
}: FlaggedProblemsViewProps) {
    const formatDate = (isoStr: string) => {
        const d = new Date(isoStr);
        if (isNaN(d.getTime())) return '-';
        return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    };

    const count = totalFlags || flaggedProblems.length;

    return (
        <div className="bg-[#121214]/90 border border-white/[0.08] rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl space-y-4">
            {/* Minimalist Widget Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center">
                        <ShieldAlert size={13} />
                    </div>
                    <h2 className="text-xs font-semibold text-white/90 tracking-tight">
                        Integrity Flags & Audit Trail
                    </h2>
                </div>

                <div className="flex items-center gap-2">
                    {isShadowBanned && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                            Shadow Banned
                        </span>
                    )}
                    {count > 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/30 font-mono">
                            {count} Active Flags
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#E8C15A]/10 text-[#E8C15A] border border-[#E8C15A]/25">
                            <CheckCircle2 size={10} /> Clean
                        </span>
                    )}
                </div>
            </div>

            {/* Content List */}
            {flaggedProblems.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-[#E8C15A]/10 text-[#E8C15A] flex items-center justify-center border border-[#E8C15A]/20">
                        <CheckCircle2 size={20} />
                    </div>
                    <p className="text-xs font-semibold text-white">No Flagged Submissions</p>
                    <p className="text-[11px] text-white/40 max-w-sm">
                        This trainee has no integrity warnings, abnormal solve times, or clipboard paste anomalies recorded.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {flaggedProblems.map((fp, index) => (
                        <div
                            key={fp.submission_id || index}
                            className="bg-black/30 border border-red-500/20 rounded-xl p-4 space-y-3 hover:border-red-500/40 transition-colors"
                        >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                                        Contest {fp.contest_id} • Problem {fp.problem_index}
                                    </span>
                                    <span className="text-xs font-semibold text-white">
                                        {fp.problem_title}
                                    </span>
                                </div>
                                <span className="text-[11px] font-mono text-white/40">
                                    {formatDate(fp.submitted_at)}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-white/[0.02] p-2.5 rounded-lg border border-white/5 font-mono">
                                <div>
                                    <span className="text-white/40 text-[10px] block">Verdict</span>
                                    <span className="font-bold text-red-400">{fp.verdict}</span>
                                </div>
                                <div>
                                    <span className="text-white/40 text-[10px] block">Solve Speed</span>
                                    <span className="text-white/80">
                                        {fp.time_to_solve_seconds ? `${fp.time_to_solve_seconds}s` : 'N/A'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-white/40 text-[10px] block">Paste Events</span>
                                    <span className="text-amber-400">
                                        {fp.paste_events ? `${fp.paste_events} Pastes` : '0'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-white/40 text-[10px] block">Codeforces</span>
                                    {fp.cf_submission_id ? (
                                        <a
                                            href={`https://codeforces.com/group/MWSDmqGsZm/contest/${fp.contest_id}/submission/${fp.cf_submission_id}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-[#E8C15A] hover:underline flex items-center gap-1"
                                        >
                                            <SiCodeforces size={11} className="text-red-400" />
                                            <span>#{fp.cf_submission_id}</span>
                                            <ExternalLink size={9} />
                                        </a>
                                    ) : (
                                        <span className="text-white/40">-</span>
                                    )}
                                </div>
                            </div>

                            <div className="bg-red-500/5 border border-red-500/15 p-2.5 rounded-lg text-xs text-red-300 flex items-start gap-2">
                                <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
                                <span>{fp.reason || 'Flagged by automated telemetry analysis'}</span>
                            </div>

                            {fp.source_code && (
                                <div className="mt-2">
                                    <div className="text-[10px] text-white/40 font-mono mb-1 uppercase tracking-wider">
                                        Flagged Code Snippet
                                    </div>
                                    <pre className="p-3 bg-[#0A0A0C] border border-white/5 rounded-lg font-mono text-[11px] text-white/80 overflow-x-auto max-h-40 [scrollbar-width:none]">
                                        {fp.source_code}
                                    </pre>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
