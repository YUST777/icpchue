'use client';

import React from 'react';
import { ShieldAlert, AlertTriangle, ExternalLink, Clock, Copy, Code } from 'lucide-react';
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
        return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="bg-[#121214] border border-white/[0.08] rounded-xl p-4 shadow-xl space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-white/5 gap-2">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-red-500/10 text-red-400">
                        <ShieldAlert size={18} />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                            Integrity Flags & Problem Audit Trail
                        </h2>
                        <span className="text-[11px] text-white/40">
                            Detailed forensics for all {totalFlags || flaggedProblems.length} flagged submissions
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {isShadowBanned && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                            Shadow Banned
                        </span>
                    )}
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-500/15 text-red-400 border border-red-500/30">
                        {totalFlags || flaggedProblems.length} Active Flags
                    </span>
                </div>
            </div>

            {/* List of Flagged Problems */}
            <div className="space-y-3">
                {flaggedProblems.length === 0 ? (
                    <div className="text-center py-10 bg-white/[0.02] border border-white/5 rounded-xl text-white/40 space-y-1">
                        <p className="text-sm font-semibold text-white">No Suspicious Problems Flagged</p>
                        <p className="text-xs">All submissions follow regular solving and keystroke patterns.</p>
                    </div>
                ) : (
                    flaggedProblems.map((p, idx) => (
                        <div
                            key={p.submission_id || idx}
                            className="bg-white/[0.02] border border-red-500/20 hover:border-red-500/40 rounded-xl p-3.5 space-y-2.5 transition-all"
                        >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#E8C15A]/10 text-[#E8C15A] font-mono">
                                        Contest {p.contest_id} • Problem {p.problem_index}
                                    </span>
                                    <span className="text-xs text-white/80 font-bold">{p.problem_title}</span>
                                </div>

                                <div className="flex items-center gap-2 text-[11px] text-white/50">
                                    <Clock size={11} />
                                    <span>{formatDate(p.submitted_at)}</span>
                                </div>
                            </div>

                            {/* Violation Reason */}
                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2.5 flex items-start gap-2 text-xs text-red-200">
                                <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
                                <div>
                                    <strong className="text-red-300 font-bold mr-1">Detected Anomaly:</strong>
                                    <span>{p.reason}</span>
                                </div>
                            </div>

                            {/* Telemetry & Links */}
                            <div className="flex flex-wrap items-center justify-between text-xs text-white/60 pt-1">
                                <div className="flex items-center gap-4 text-[11px]">
                                    {p.time_to_solve_seconds ? (
                                        <span>Solve Speed: <strong className="text-white">{p.time_to_solve_seconds}s</strong></span>
                                    ) : null}
                                    {p.paste_events ? (
                                        <span>Paste Events: <strong className="text-red-300">{p.paste_events}</strong></span>
                                    ) : null}
                                    <span>Verdict: <strong className="text-emerald-400">{p.verdict}</strong></span>
                                </div>

                                {p.cf_submission_id && (
                                    <a
                                        href={`https://codeforces.com/group/MWSDmqGsZm/contest/${p.contest_id}/submission/${p.cf_submission_id}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 text-[11px] text-[#E8C15A] hover:underline"
                                    >
                                        <SiCodeforces size={11} className="text-red-400" />
                                        <span>View Codeforces Submission #{p.cf_submission_id}</span>
                                        <ExternalLink size={9} />
                                    </a>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
