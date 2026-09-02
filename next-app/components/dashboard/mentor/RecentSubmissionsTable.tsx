'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FileCode2, Clock, CheckCircle2, XCircle, AlertTriangle, 
    X, Copy, Check, ExternalLink, Cpu, HardDrive, Terminal
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
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Close on Escape & Lock Body Scroll
    useEffect(() => {
        if (!activeSubModal) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setActiveSubModal(null);
        };

        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = originalOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [activeSubModal]);

    const getVerdictBadge = (verdict?: string) => {
        const lower = (verdict || '').toLowerCase();
        if (lower.includes('accepted') || lower === 'ac' || lower === 'ok') {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#E8C15A]/15 text-[#E8C15A] border border-[#E8C15A]/25">
                    <CheckCircle2 size={10} /> Accepted
                </span>
            );
        }
        if (lower.includes('wrong') || lower.includes('wa')) {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/15 text-red-400 border border-red-500/25">
                    <XCircle size={10} /> Wrong Answer
                </span>
            );
        }
        if (lower.includes('time') || lower.includes('tle')) {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/25">
                    <Clock size={10} /> Time Limit
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/25">
                <AlertTriangle size={10} /> {verdict || 'Unknown'}
            </span>
        );
    };

    const handleCopy = (code: string) => {
        if (!code) return;
        navigator.clipboard.writeText(code).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }).catch((err) => {
            console.warn('Clipboard write failed:', err);
        });
    };

    const formatDate = (isoStr?: string) => {
        if (!isoStr) return '-';
        const d = new Date(isoStr);
        if (isNaN(d.getTime())) return '-';
        return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    };

    const modalContent = (
        <AnimatePresence>
            {activeSubModal && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6">
                    {/* Fullscreen Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        onClick={() => setActiveSubModal(null)}
                        className="fixed inset-0 bg-black/80 backdrop-blur-lg"
                    />

                    {/* Centered Modal Card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 8 }}
                        transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                        className="relative w-full max-w-2xl bg-[#141416]/95 border border-white/[0.12] rounded-2xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-2xl flex flex-col z-10 my-auto max-h-[85vh]"
                    >
                        {/* Header */}
                        <div className="px-4 py-3 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                <div className="w-7 h-7 rounded-lg bg-[#E8C15A]/10 text-[#E8C15A] flex items-center justify-center border border-[#E8C15A]/20 shrink-0">
                                    <Terminal size={14} />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-semibold text-white tracking-tight truncate">
                                            {activeSubModal.problem}
                                        </h3>
                                        {getVerdictBadge(activeSubModal.verdict)}
                                    </div>
                                    <div className="text-[10px] text-white/45 truncate mt-0.5">
                                        {activeSubModal.problem_title ? `${activeSubModal.problem_title} • ` : ''}
                                        <span>{formatDate(activeSubModal.submitted_at)}</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setActiveSubModal(null)}
                                className="w-7 h-7 rounded-full bg-white/[0.06] hover:bg-white/[0.12] active:scale-95 text-white/60 hover:text-white transition-all flex items-center justify-center border border-white/[0.08] shrink-0"
                                title="Close (Esc)"
                            >
                                <X size={13} />
                            </button>
                        </div>

                        {/* Ultra-Minimalist Single-Line Metadata Strip */}
                        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-black/40 border-b border-white/[0.06] text-[11px] font-mono text-white/70">
                            <div className="flex items-center gap-3 flex-wrap">
                                <span className="text-white/40">
                                    Lang: <strong className="text-white/90 font-medium">{activeSubModal.language}</strong>
                                </span>
                                <span className="text-white/20">•</span>
                                <span className="text-white/40">
                                    Time: <strong className="text-white/90 font-medium">{activeSubModal.time_ms ?? 0}ms</strong>
                                </span>
                                <span className="text-white/20">•</span>
                                <span className="text-white/40">
                                    Mem: <strong className="text-white/90 font-medium">{activeSubModal.memory_kb ? `${(activeSubModal.memory_kb / 1024).toFixed(1)}MB` : '-'}</strong>
                                </span>
                            </div>

                            {activeSubModal.cf_submission_id ? (
                                <a
                                    href={`https://codeforces.com/group/MWSDmqGsZm/contest/${activeSubModal.contest_id}/submission/${activeSubModal.cf_submission_id}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[#E8C15A] hover:underline flex items-center gap-1 font-medium shrink-0"
                                >
                                    <SiCodeforces size={10} className="text-red-400" />
                                    <span>#{activeSubModal.cf_submission_id}</span>
                                    <ExternalLink size={9} />
                                </a>
                            ) : null}
                        </div>

                        {/* Source Code Container */}
                        <div className="p-3.5 flex-1 flex flex-col bg-[#0A0A0C] min-h-[220px] max-h-[50vh] overflow-hidden">
                            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.06] text-xs">
                                <span className="text-white/40 text-[10px] font-mono uppercase tracking-wider">Source Code</span>
                                <div className="flex items-center gap-1.5">
                                    {activeSubModal.contest_id && activeSubModal.problem_index && (
                                        <a
                                            href={`https://codeforces.com/contest/${activeSubModal.contest_id}/problem/${activeSubModal.problem_index}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] active:scale-95 text-white/80 hover:text-white transition-all text-xs flex items-center gap-1 border border-white/[0.08] font-mono"
                                            title="Open problem on Codeforces"
                                        >
                                            <span>CF Problem</span>
                                            <ExternalLink size={10} className="text-white/40" />
                                        </a>
                                    )}
                                    {activeSubModal.source_code && (
                                        <button
                                            onClick={() => {
                                                const blob = new Blob([activeSubModal.source_code || ''], { type: 'text/plain;charset=utf-8' });
                                                const url = URL.createObjectURL(blob);
                                                const a = document.createElement('a');
                                                a.href = url;
                                                a.download = `${activeSubModal.problem.replace(/\s+/g, '_')}_sub_${activeSubModal.id}.cpp`;
                                                a.click();
                                                URL.revokeObjectURL(url);
                                            }}
                                            className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] active:scale-95 text-white/80 hover:text-white transition-all text-xs flex items-center gap-1 border border-white/[0.08]"
                                            title="Download source code"
                                        >
                                            <Terminal size={11} />
                                            <span>Download</span>
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleCopy(activeSubModal.source_code || '')}
                                        className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] active:scale-95 text-white/80 hover:text-white transition-all text-xs flex items-center gap-1.5 border border-white/[0.08]"
                                    >
                                        {copied ? <Check size={11} className="text-[#E8C15A]" /> : <Copy size={11} />}
                                        <span>{copied ? 'Copied' : 'Copy Code'}</span>
                                    </button>
                                </div>
                            </div>

                            <div className="font-mono text-xs overflow-y-auto flex-1 p-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden leading-relaxed">
                                {activeSubModal.source_code ? (
                                    <div className="flex text-white/85">
                                        <div className="select-none text-white/20 text-right pr-3.5 border-r border-white/[0.08] space-y-0.5 shrink-0 font-mono text-[11px]">
                                            {activeSubModal.source_code.split('\n').map((_, i) => (
                                                <div key={i}>{i + 1}</div>
                                            ))}
                                        </div>
                                        <div className="pl-3.5 space-y-0.5 whitespace-pre flex-1 text-[#E2E2E5]">
                                            {activeSubModal.source_code.split('\n').map((line, i) => (
                                                <div key={i} className="hover:bg-white/[0.02] rounded-xs px-1">
                                                    {line || '\n'}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-white/30 text-xs font-mono">
                                        No source code recorded for this submission.
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );

    return (
        <div className="bg-[#121214]/90 border border-white/[0.08] rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/[0.06]">
                <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-[#E8C15A]/10 text-[#E8C15A] flex items-center justify-center">
                        <FileCode2 size={13} />
                    </div>
                    <h2 className="text-xs font-semibold text-white/90 tracking-tight">Recent Submissions Feed</h2>
                </div>
                <span className="text-[11px] text-white/40 font-mono">
                    {submissions.length} Recorded
                </span>
            </div>

            {/* Submissions List */}
            <div className="overflow-y-auto max-h-[300px] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden flex-1 overflow-x-auto">
                <table className="w-full min-w-[480px] text-left border-collapse">
                    <thead className="sticky top-0 bg-[#121214] z-10">
                        <tr className="text-white/40 border-b border-white/[0.06] text-[10px] font-medium uppercase tracking-wider">
                            <th className="pb-2.5 pl-1.5 font-medium">Problem</th>
                            <th className="pb-2.5 text-center font-medium">Curriculum</th>
                            <th className="pb-2.5 text-left font-medium">Verdict</th>
                            <th className="pb-2.5 text-center font-medium">Language</th>
                            <th className="pb-2.5 text-center font-medium">Time</th>
                            <th className="pb-2.5 pr-1.5 text-right font-medium">Attempt</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                        {submissions.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="py-8 text-center text-white/35 text-xs font-mono">
                                    No submissions recorded yet.
                                </td>
                            </tr>
                        ) : (
                            submissions.map((sub, idx) => (
                                <tr 
                                    key={sub.id || idx} 
                                    onClick={() => setActiveSubModal(sub)}
                                    className="hover:bg-white/[0.03] active:bg-white/[0.06] transition-colors cursor-pointer group"
                                >
                                    <td className="py-2.5 pl-1.5 font-medium text-white/90 group-hover:text-[#E8C15A] transition-colors text-xs truncate max-w-[150px]">
                                        {sub.problem}
                                    </td>
                                    <td className="py-2.5 text-center text-white/50 font-mono text-[11px]">
                                        {sub.sheet_info ? `${sub.sheet_info.level} / Sheet ${sub.sheet_info.sheet_letter}` : (sub.sheet_id ? `Sheet ${sub.sheet_id}` : '-')}
                                    </td>
                                    <td className="py-2.5">
                                        {getVerdictBadge(sub.verdict)}
                                    </td>
                                    <td className="py-2.5 text-center text-white/50 text-[11px] font-mono">
                                        {(sub.language || 'C++').split(' ')[0]}
                                    </td>
                                    <td className="py-2.5 text-center text-white/60 font-mono text-[11px]">
                                        {sub.time_ms !== null && sub.time_ms !== undefined ? `${sub.time_ms}ms` : '-'}
                                    </td>
                                    <td className="py-2.5 pr-1.5 text-right font-mono text-white/70 text-xs">
                                        #{sub.attempts || 1}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {/* Load More Button */}
                {hasMore && (
                    <div className="p-3 text-center border-t border-white/[0.06]">
                        <button
                            onClick={onLoadMore}
                            disabled={loadingMore}
                            className="px-4 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] active:scale-[0.98] text-white/80 hover:text-white rounded-xl text-xs font-medium transition-all border border-white/[0.08] disabled:opacity-50"
                        >
                            {loadingMore ? 'Loading...' : 'Load Next 100 Submissions'}
                        </button>
                    </div>
                )}
            </div>

            {/* Portal to Body for True Fullscreen Overlay */}
            {mounted && createPortal(modalContent, document.body)}
        </div>
    );
}
