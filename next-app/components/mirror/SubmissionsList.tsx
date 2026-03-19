import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, History, Globe, Clock, MemoryStick, RefreshCw, ChevronRight, CheckCircle2, XCircle, AlertCircle, Timer } from 'lucide-react';
import { Submission } from './types';

interface SubmissionsListProps {
    submissions: Submission[];
    loading: boolean;
    onViewCode: (id: number) => void;
    contestId?: string;
    problemIndex?: string;
    urlType?: string;
    groupId?: string;
}

interface GlobalSubmission {
    id: number;
    creationTimeSeconds: number;
    author: string;
    verdict: string;
    timeConsumedMillis: number;
    memoryConsumedBytes: number;
    language: string;
}

/* ── helpers ── */

function timeAgo(dateStr: string): string {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diff = Math.max(0, now - then);
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return 'just now';
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min} min ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} hr ago`;
    const days = Math.floor(hr / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
}

function timeAgoUnix(ts: number | string): string {
    const tsNum = typeof ts === 'string' ? parseInt(ts) || 0 : ts;
    if (!tsNum) return 'recently';
    const now = Date.now();
    const then = tsNum * 1000;
    const diff = Math.max(0, now - then);
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return 'just now';
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min} min ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} hr ago`;
    const days = Math.floor(hr / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(then).toLocaleDateString();
}

function formatMemory(kb: number | string): string {
    if (!kb && kb !== 0) return '-';
    if (typeof kb === 'string') return kb;
    if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`;
    return `${kb} KB`;
}

function formatTime(ms: number | string): string {
    if (!ms && ms !== 0) return '-';
    if (typeof ms === 'string') return ms;
    return `${ms} ms`;
}

function formatVerdict(v: string): string {
    if (!v) return 'Unknown';
    const vUpper = v.toUpperCase();
    if (vUpper === 'OK' || vUpper === 'ACCEPTED') return 'Accepted';
    if (vUpper === 'WRONG_ANSWER') return 'Wrong Answer';
    if (vUpper === 'TIME_LIMIT_EXCEEDED') return 'TLE';
    if (vUpper === 'MEMORY_LIMIT_EXCEEDED') return 'MLE';
    if (vUpper === 'RUNTIME_ERROR') return 'Runtime Error';
    if (vUpper === 'COMPILATION_ERROR') return 'Compile Error';
    return v.replace(/_/g, ' ');
}

type VerdictType = 'accepted' | 'error' | 'pending';

function getVerdictType(v: string): VerdictType {
    if (!v) return 'error';
    if (v === 'Accepted' || v === 'OK') return 'accepted';
    const upper = v.toUpperCase();
    if (upper === 'TESTING' || upper === 'PENDING' || upper === 'IN QUEUE' || upper.includes('WAITING') || upper.includes('PENDING')) return 'pending';
    return 'error';
}

const verdictColors: Record<VerdictType, { text: string; bg: string; border: string }> = {
    accepted: { text: 'text-[#2cbb5d]', bg: 'bg-[#2cbb5d]/10', border: 'border-[#2cbb5d]/30' },
    error: { text: 'text-[#ef4743]', bg: 'bg-[#ef4743]/10', border: 'border-[#ef4743]/30' },
    pending: { text: 'text-[#ffa116]', bg: 'bg-[#ffa116]/10', border: 'border-[#ffa116]/30' },
};

/* ── component ── */

export default function SubmissionsList({ 
    submissions, loading, onViewCode, contestId, problemIndex, urlType, groupId 
}: SubmissionsListProps) {
    const [mode, setMode] = useState<'local' | 'global'>('local');
    const [globalSubmissions, setGlobalSubmissions] = useState<GlobalSubmission[]>([]);
    const [globalLoading, setGlobalLoading] = useState(false);
    const [globalError, setGlobalError] = useState(false);
    const [hoveredId, setHoveredId] = useState<number | null>(null);

    const fetchGlobal = useCallback(async () => {
        if (!contestId) return;
        setGlobalLoading(true);
        setGlobalError(false);
        try {
            const params = new URLSearchParams();
            params.set('contestId', contestId);
            if (problemIndex) params.set('problemIndex', problemIndex);
            if (urlType) params.set('urlType', urlType);
            if (groupId) params.set('groupId', groupId);

            const res = await fetch(`/api/codeforces/submissions?${params.toString()}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setGlobalSubmissions(data);
            } else {
                setGlobalSubmissions([]);
            }
        } catch (err) {
            console.error('Failed to fetch global submissions', err);
            setGlobalError(true);
        } finally {
            setGlobalLoading(false);
        }
    }, [contestId, problemIndex, urlType, groupId]);

    useEffect(() => {
        if (mode === 'global' && globalSubmissions.length === 0) {
            fetchGlobal();
        }
    }, [mode, globalSubmissions.length, fetchGlobal]);

    return (
        <div className="flex flex-col h-full">
            {/* ── Tab Header ── */}
            <div className="flex items-center gap-0 border-b border-white/[0.06] mb-1">
                <button
                    onClick={() => setMode('local')}
                    className={`relative px-4 py-2.5 text-xs font-medium transition-colors ${
                        mode === 'local'
                            ? 'text-white'
                            : 'text-[#666] hover:text-[#999]'
                    }`}
                >
                    Your Submissions
                    {mode === 'local' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E8C15A]" />
                    )}
                </button>
                <button
                    onClick={() => setMode('global')}
                    className={`relative px-4 py-2.5 text-xs font-medium transition-colors ${
                        mode === 'global'
                            ? 'text-white'
                            : 'text-[#666] hover:text-[#999]'
                    }`}
                >
                    Global Feed
                    {mode === 'global' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E8C15A]" />
                    )}
                </button>
            </div>

            {/* ── List Content ── */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {mode === 'local' ? (
                    <LocalSubmissions
                        submissions={submissions}
                        loading={loading}
                        onViewCode={onViewCode}
                        hoveredId={hoveredId}
                        setHoveredId={setHoveredId}
                    />
                ) : (
                    <GlobalSubmissions
                        submissions={globalSubmissions}
                        loading={globalLoading}
                        error={globalError}
                        onRefresh={fetchGlobal}
                    />
                )}
            </div>
        </div>
    );
}

/* ── Local Submissions View ── */

function LocalSubmissions({ submissions, loading, onViewCode, hoveredId, setHoveredId }: any) {
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="animate-spin text-[#E8C15A]" size={20} />
                <span className="text-xs text-[#666]">Loading your submissions...</span>
            </div>
        );
    }

    if (submissions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
                <History className="text-[#333]" size={24} />
                <span className="text-xs text-[#555]">No local submissions yet</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col">
            {/* ── Headers ── */}
            <div className="grid grid-cols-[1fr_80px_80px_72px_28px] gap-2 px-4 py-2 text-[10px] font-bold text-[#444] uppercase tracking-wider border-b border-white/[0.03]">
                <span>Status</span>
                <span className="text-right">Runtime</span>
                <span className="text-right">Memory</span>
                <span className="text-right">Tests</span>
                <span />
            </div>

            {/* ── Rows ── */}
            {submissions.map((sub: any, idx: number) => {
                const vType = getVerdictType(sub.verdict);
                const colors = verdictColors[vType];
                const isHovered = hoveredId === sub.id;

                return (
                    <div
                        key={sub.id}
                        onClick={() => onViewCode(sub.id)}
                        onMouseEnter={() => setHoveredId(sub.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        className={`group grid grid-cols-[1fr_80px_80px_72px_28px] gap-2 items-center px-4 py-2.5 cursor-pointer transition-colors ${
                            isHovered ? 'bg-white/[0.03]' : idx % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.015]'
                        }`}
                    >
                        {/* Status */}
                        <div className="flex flex-col gap-0.5 min-w-0">
                            <div className="flex items-center gap-2">
                                {vType === 'accepted' ? (
                                    <CheckCircle2 size={14} className="text-[#2cbb5d] shrink-0" />
                                ) : vType === 'pending' ? (
                                    <Timer size={14} className="text-[#ffa116] shrink-0" />
                                ) : (
                                    <XCircle size={14} className="text-[#ef4743] shrink-0" />
                                )}
                                <span className={`text-sm font-medium truncate ${colors.text}`}>
                                    {formatVerdict(sub.verdict)}
                                </span>
                            </div>
                            <span className="text-[10px] text-[#555] pl-[22px]">
                                {timeAgo(sub.submittedAt)}
                            </span>
                        </div>

                        {/* Runtime */}
                        <span className="text-xs text-[#999] text-right tabular-nums">
                            {formatTime(sub.timeMs)}
                        </span>

                        {/* Memory */}
                        <span className="text-xs text-[#999] text-right tabular-nums">
                            {formatMemory(sub.memoryKb)}
                        </span>

                        {/* Tests */}
                        <span className="text-xs text-right tabular-nums">
                            <span className={vType === 'accepted' ? 'text-[#2cbb5d]' : 'text-[#999]'}>
                                {sub.testCasesPassed || 0}
                            </span>
                            <span className="text-[#444]">/{sub.totalTestCases || 0}</span>
                        </span>

                        {/* Arrow */}
                        <ChevronRight
                            size={14}
                            className={`transition-all ${
                                isHovered ? 'text-[#999] translate-x-0.5' : 'text-[#333]'
                            }`}
                        />
                    </div>
                );
            })}
        </div>
    );
}

/* ── Global Feed View ── */

function GlobalSubmissions({ submissions, loading, error, onRefresh }: any) {
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="animate-spin text-[#E8C15A]" size={20} />
                <span className="text-xs text-[#666]">Scraping global activity...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-16 px-6 gap-4 text-center">
                <AlertCircle className="text-[#ef4743]" size={24} />
                <div className="space-y-1">
                    <p className="text-xs text-[#888]">Failed to load global submissions</p>
                    <p className="text-[10px] text-[#555]">CF might be rate-limiting or this is a private contest.</p>
                </div>
                <button 
                    onClick={onRefresh}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs transition-colors"
                >
                    <RefreshCw size={14} />
                    Try Again
                </button>
            </div>
        );
    }

    if (submissions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Globe className="text-[#333]" size={24} />
                <span className="text-xs text-[#555]">No global submissions yet</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col">
            <div className="grid grid-cols-[1fr_90px_72px_72px] gap-2 px-4 py-2 text-[10px] font-bold text-[#444] uppercase tracking-wider border-b border-white/[0.03]">
                <span>Author & Verdict</span>
                <span className="text-right">Time</span>
                <span className="text-right">Memory</span>
                <span className="text-right">Lang</span>
            </div>

            {submissions.map((sub: any, idx: number) => {
                const vType = getVerdictType(sub.verdict);
                const colors = verdictColors[vType];

                return (
                    <div
                        key={sub.id}
                        className={`grid grid-cols-[1fr_90px_72px_72px] gap-2 items-center px-4 py-2.5 transition-colors ${
                             idx % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.015]'
                        }`}
                    >
                        <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="text-xs font-bold text-[#E8C15A] truncate">
                                {sub.author}
                            </span>
                            <span className={`text-[10px] font-medium ${colors.text}`}>
                                {formatVerdict(sub.verdict)}
                            </span>
                        </div>
                        <span className="text-[10px] text-[#888] text-right">
                            {formatTime(sub.timeConsumedMillis)}
                        </span>
                        <span className="text-[10px] text-[#888] text-right">
                            {formatMemory(sub.memoryConsumedBytes / 1024)}
                        </span>
                        <span className="text-[10px] text-[#666] text-right truncate">
                            {sub.language}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}
