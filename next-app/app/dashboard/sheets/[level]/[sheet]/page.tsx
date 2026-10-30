'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Editor } from '@monaco-editor/react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle2, Lock, List, FileText, XCircle, AlertTriangle, Users, Filter, ArrowUpDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { getCachedData, fetchWithCache } from '@/lib/cache/api-cache';

interface Problem {
    id: string;
    letter: string;
    title: string;
    number: number;
    codeforcesUrl: string;
    difficulty?: string;
    available: boolean;
    solvedCount?: number;
    userStatus?: 'SOLVED' | 'ATTEMPTED' | null;
}

interface Sheet {
    id: string;
    name: string;
    slug: string;
    description: string;
    totalProblems: number;
    problems: Problem[];
}

interface Submission {
    id: number;
    problemId: string;
    verdict: string;
    timeMs: number;
    memoryKb: number;
    testsPassed?: number | null;
    totalTests?: number | null;
    submittedAt: string;
    attemptNumber?: number | null;
    language: string;
    source: 'judge0' | 'codeforces';
    cfSubmissionId?: number | null;
    sourceCode?: string;
}

export default function SheetDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const levelSlug = params.level as string;
    const sheetSlug = params.sheet as string;

    const detailsUrl = `/api/curriculum/details/${levelSlug}/${sheetSlug}`;
    const initialCached = useMemo(() => getCachedData<any>(detailsUrl), [detailsUrl]);

    const [sheet, setSheet] = useState<Sheet | null>(() => {
        if (!initialCached?.sheet || !initialCached?.problems) return null;
        const problems = initialCached.problems.map((p: any) => ({
            ...p,
            available: true,
            userStatus: p.userStatus
        }));
        return { ...initialCached.sheet, problems };
    });
    const [loading, setLoading] = useState(!initialCached?.sheet);
    const [activeTab, setActiveTab] = useState<'problems' | 'submissions'>('problems');
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [submissionsLoading, setSubmissionsLoading] = useState(false);
    const [selectedSubmission, setSelectedSubmission] = useState<{
        id: number;
        verdict: string;
        sourceCode: string;
        submittedAt: string;
        attemptNumber?: number | null;
        problemId: string;
        source: 'judge0' | 'codeforces';
    } | null>(null);
    const [loadingCode, setLoadingCode] = useState(false);

    // Filter and Sort state
    const [verdictFilter, setVerdictFilter] = useState<'all' | 'accepted' | 'wrong'>('all');
    const [problemFilter, setProblemFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'date' | 'time' | 'memory' | 'problem'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    const fetchSheetData = useCallback(async () => {
        try {
            const data = await fetchWithCache<any>(detailsUrl, {}, 180);
            if (data?.sheet && data?.problems) {
                // Add "available" property to problems (all are available in curriculum)
                const problems = data.problems.map((p: any) => ({
                    ...p,
                    available: true,
                    userStatus: p.userStatus
                }));
                setSheet({ ...data.sheet, problems });
            } else {
                router.push('/dashboard/sheets');
            }
        } catch (error) {
            console.error('Failed to fetch sheet:', error);
        } finally {
            setLoading(false);
        }
    }, [detailsUrl, router]);

    // Keep sheet in sync with cache when navigating between sheets
    useEffect(() => {
        const cached = getCachedData<any>(detailsUrl);
        if (cached?.sheet && cached?.problems) {
            const problems = cached.problems.map((p: any) => ({
                ...p,
                available: true,
                userStatus: p.userStatus
            }));
            setSheet({ ...cached.sheet, problems });
            setLoading(false);
        }
    }, [detailsUrl]);

    useEffect(() => {
        fetchSheetData();
    }, [fetchSheetData]);

    /* Redundant fetchSolvedProblems removed - now handled by fetchSheetData */

    const fetchSubmissions = useCallback(async () => {
        if (!user || !sheet?.id) return;
        const subUrl = `/api/submissions?sheetId=${sheet.id}&limit=100`;
        const cachedSubs = getCachedData<any>(subUrl);
        if (cachedSubs?.submissions && submissions.length === 0) {
            setSubmissions(cachedSubs.submissions);
        } else {
            setSubmissionsLoading(true);
        }
        try {
            const data = await fetchWithCache<any>(subUrl, {
                credentials: 'include'
            }, 60);
            if (data?.submissions) {
                setSubmissions(data.submissions);
            }
        } catch (error) {
            console.error('Failed to fetch submissions:', error);
        } finally {
            setSubmissionsLoading(false);
        }
    }, [user, sheet?.id, submissions.length]);

    useEffect(() => {
        if (activeTab === 'submissions' && sheet?.id) {
            fetchSubmissions();
        }
    }, [activeTab, sheet?.id, fetchSubmissions]);

    // Computed filtered and sorted submissions
    const filteredSubmissions = useMemo(() => {
        let result = [...submissions];
        if (verdictFilter === 'accepted') result = result.filter(s => s.verdict === 'Accepted');
        else if (verdictFilter === 'wrong') result = result.filter(s => s.verdict !== 'Accepted');
        if (problemFilter !== 'all') result = result.filter(s => s.problemId === problemFilter);

        result.sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case 'date': comparison = new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime(); break;
                case 'time': comparison = (a.timeMs || 0) - (b.timeMs || 0); break;
                case 'memory': comparison = (a.memoryKb || 0) - (b.memoryKb || 0); break;
                case 'problem': comparison = a.problemId.localeCompare(b.problemId); break;
            }
            return sortOrder === 'desc' ? -comparison : comparison;
        });
        return result;
    }, [submissions, verdictFilter, problemFilter, sortBy, sortOrder]);

    const uniqueProblems = useMemo(() => {
        const ids = new Set(submissions.map(s => s.problemId));
        return Array.from(ids).sort();
    }, [submissions]);

    const viewSubmissionCode = async (sub: Submission) => {
        if (sub.source === 'judge0') {
            // Fetch full source code from Judge0 submission detail
            setLoadingCode(true);
            try {
                const res = await fetch(`/api/submissions/${sub.id}`, {
                    credentials: 'include'
                });
                if (res.ok) {
                    const data = await res.json();
                    const detail = data.submission;
                    setSelectedSubmission({
                        id: detail.id,
                        verdict: detail.verdict,
                        sourceCode: detail.sourceCode || '// Source code not available',
                        submittedAt: detail.submittedAt,
                        attemptNumber: detail.attemptNumber,
                        problemId: sub.problemId,
                        source: 'judge0'
                    });
                }
            } catch (error) {
                console.error('Failed to fetch submission code:', error);
            } finally {
                setLoadingCode(false);
            }
        } else {
            // CF submission — fetch from cf_submissions detail
            setLoadingCode(true);
            try {
                const res = await fetch(`/api/submissions/cf/${sub.id}`, {
                    credentials: 'include'
                });
                if (res.ok) {
                    const data = await res.json();
                    setSelectedSubmission({
                        id: sub.id,
                        verdict: sub.verdict,
                        sourceCode: data.sourceCode || '// Source code was not saved for this Codeforces submission',
                        submittedAt: sub.submittedAt,
                        attemptNumber: null,
                        problemId: sub.problemId,
                        source: 'codeforces'
                    });
                } else {
                    // Fallback — just show what we have
                    setSelectedSubmission({
                        id: sub.id,
                        verdict: sub.verdict,
                        sourceCode: '// Source code not available for Codeforces submissions',
                        submittedAt: sub.submittedAt,
                        attemptNumber: null,
                        problemId: sub.problemId,
                        source: 'codeforces'
                    });
                }
            } catch {
                setSelectedSubmission({
                    id: sub.id,
                    verdict: sub.verdict,
                    sourceCode: '// Could not fetch source code',
                    submittedAt: sub.submittedAt,
                    attemptNumber: null,
                    problemId: sub.problemId,
                    source: 'codeforces'
                });
            } finally {
                setLoadingCode(false);
            }
        }
    };

    const getVerdictStyle = (verdict: string) => {
        if (verdict === 'Accepted') return 'text-green-400';
        if (verdict.includes('Wrong')) return 'text-red-400';
        if (verdict.includes('Time')) return 'text-yellow-400';
        if (verdict.includes('Compilation')) return 'text-orange-400';
        if (verdict.includes('Runtime')) return 'text-purple-400';
        return 'text-gray-400';
    };

    const getVerdictIcon = (verdict: string) => {
        if (verdict === 'Accepted') return <CheckCircle2 size={14} className="text-green-400" />;
        if (verdict.includes('Wrong') || verdict.includes('Runtime')) return <XCircle size={14} className="text-red-400" />;
        return <AlertTriangle size={14} className="text-yellow-400" />;
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
        });
    };

    useEffect(() => {
        if (!authLoading && !user) router.push('/login');
    }, [authLoading, user, router]);

    // Only show skeleton on first visit when we don't have sheet data yet.
    // If sheet data was already cached or loaded, render it immediately with zero skeleton.
    if (!sheet) {
        // Same containers as the loaded page below, with grey bars in place of text.
        return (
            <div className="space-y-6" role="status" aria-label="Loading sheet">
                <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-2xl p-6 border border-white/10">
                    <div className="flex items-start justify-between flex-wrap gap-4">
                        <div>
                            <Skeleton className="h-8 md:h-9 w-48 rounded-lg mb-2" />
                            <Skeleton className="h-5 w-72 max-w-full rounded" />
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex flex-col items-center gap-1">
                                <Skeleton className="h-8 w-8 rounded" />
                                <Skeleton className="h-4 w-10 rounded" />
                            </div>
                            <div className="w-px h-10 bg-white/10" />
                            <div className="flex flex-col items-center gap-1">
                                <Skeleton className="h-8 w-8 rounded" />
                                <Skeleton className="h-4 w-14 rounded" />
                            </div>
                        </div>
                    </div>
                    <div className="mt-4">
                        <div className="flex justify-between mb-1">
                            <Skeleton className="h-4 w-14 rounded" />
                            <Skeleton className="h-4 w-8 rounded" />
                        </div>
                        <Skeleton className="h-2 w-full rounded-full" />
                    </div>
                </div>

                <div className="flex gap-2 border-b border-white/10">
                    <div className="px-4 py-3 border-b-2 border-transparent"><Skeleton className="h-5 w-24 rounded" /></div>
                    <div className="px-4 py-3 border-b-2 border-transparent"><Skeleton className="h-5 w-36 rounded" /></div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                    {Array.from({ length: 16 }).map((_, i) => (
                        <div key={i} className="rounded-xl p-2.5 sm:p-3 border border-white/10 bg-[#121212] aspect-square flex flex-col justify-between items-center">
                            <div className="w-full flex justify-between">
                                <Skeleton className="h-3 w-8 rounded" />
                            </div>
                            <Skeleton className="h-8 w-7 rounded my-auto" />
                            <Skeleton className="h-2.5 w-4/5 rounded" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (!sheet) return null;

    const availableProblems = sheet.problems.filter(p => p.available);
    const solvedCount = availableProblems.filter(p => p.userStatus === 'SOLVED').length;

    return (
        <>
            <div className="space-y-6 animate-fade-in">
                {/* Sheet Header */}
                <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-2xl p-6 border border-white/10">
                    <div className="flex items-start justify-between flex-wrap gap-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-[#F2F2F2] mb-2">{sheet.name}</h1>
                            <p className="text-[#808080] text-sm">{sheet.description}</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-[#E8C15A]">{solvedCount}</div>
                                <div className="text-xs text-[#666]">Solved</div>
                            </div>
                            <div className="w-px h-10 bg-white/10"></div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-[#F2F2F2]">{availableProblems.length}</div>
                                <div className="text-xs text-[#666]">Available</div>
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4">
                        <div className="flex justify-between text-xs text-[#666] mb-1">
                            <span>Progress</span>
                            <span>{Math.round((solvedCount / Math.max(availableProblems.length, 1)) * 100)}%</span>
                        </div>
                        <div className="w-full h-2 bg-[#1A1A1A] rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-[#E8C15A] to-[#CFA144] rounded-full transition-all duration-500"
                                style={{ width: `${(solvedCount / Math.max(availableProblems.length, 1)) * 100}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 border-b border-white/10">
                    <button
                        onClick={() => setActiveTab('problems')}
                        className={`px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'problems'
                            ? 'text-[#E8C15A] border-[#E8C15A]'
                            : 'text-[#666] border-transparent hover:text-[#A0A0A0]'
                            }`}
                    >
                        <List size={16} />
                        Problems
                    </button>
                    <button
                        onClick={() => setActiveTab('submissions')}
                        className={`px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'submissions'
                            ? 'text-[#E8C15A] border-[#E8C15A]'
                            : 'text-[#666] border-transparent hover:text-[#A0A0A0]'
                            }`}
                    >
                        <FileText size={16} />
                        My Submissions
                        {submissions.length > 0 && (
                            <span className="ml-1 px-1.5 py-0.5 text-xs bg-white/10 rounded">
                                {submissions.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* Problems Tab */}
                {activeTab === 'problems' && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                        {sheet.problems.map((problem) => {
                            const isSolved = problem.userStatus === 'SOLVED';
                            const isAttempted = problem.userStatus === 'ATTEMPTED';
                            const isAvailable = problem.available;

                            return (
                                <Link
                                    key={problem.id}
                                    href={isAvailable ? `/dashboard/sheets/${levelSlug}/${sheetSlug}/${problem.letter.trim()}` : '#'}
                                    className={`
                                        relative group rounded-xl p-2.5 sm:p-3 border transition-all aspect-square flex flex-col justify-between items-center text-center
                                        ${isAvailable
                                            ? isSolved
                                                ? 'bg-green-500/10 border-green-500/30 hover:border-green-500/60 hover:bg-green-500/15'
                                                : isAttempted
                                                    ? 'bg-red-500/10 border-red-500/30 hover:border-red-500/60 hover:bg-red-500/15'
                                                    : 'bg-[#121212] border-white/10 hover:border-[#E8C15A]/40 hover:bg-[#161616]'
                                            : 'bg-[#0d0d0d] border-white/5 cursor-not-allowed opacity-40'
                                        }
                                    `}
                                    onClick={(e) => !isAvailable && e.preventDefault()}
                                >
                                    {/* Top bar: solve count on left, lock on right if unavailable */}
                                    <div className="w-full flex items-center justify-between min-h-[14px]">
                                        {isAvailable ? (
                                            <div className={`flex items-center gap-1 text-[10px] font-mono tracking-tight transition-colors ${
                                                isSolved
                                                    ? 'text-green-400/60 group-hover:text-green-300'
                                                    : isAttempted
                                                        ? 'text-red-400/60 group-hover:text-red-300'
                                                        : 'text-white/45 group-hover:text-white/80'
                                            }`}>
                                                <Users size={10} className="opacity-70" />
                                                <span>{problem.solvedCount || 0}</span>
                                            </div>
                                        ) : (
                                            <div />
                                        )}

                                        {!isAvailable && (
                                            <Lock size={12} className="text-[#444]" />
                                        )}
                                    </div>

                                    {/* Center: Problem Letter */}
                                    <div className={`
                                        text-2xl sm:text-3xl font-bold my-auto leading-none transition-colors
                                        ${isAvailable
                                            ? isSolved
                                                ? 'text-green-400'
                                                : isAttempted
                                                    ? 'text-red-400'
                                                    : 'text-[#F2F2F2] group-hover:text-[#E8C15A]'
                                            : 'text-[#444]'
                                        }
                                    `}>
                                        {problem.letter}
                                    </div>

                                    {/* Bottom: Problem Title */}
                                    <div className={`
                                        w-full text-[10px] sm:text-[11px] truncate font-medium text-center transition-colors
                                        ${isAvailable
                                            ? isSolved
                                                ? 'text-green-400/70 group-hover:text-green-300'
                                                : isAttempted
                                                    ? 'text-red-400/70 group-hover:text-red-300'
                                                    : 'text-[#808080] group-hover:text-[#A0A0A0]'
                                            : 'text-[#333]'
                                        }
                                    `} title={problem.title}>
                                        {problem.title}
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}

                {/* Submissions Tab */}
                {activeTab === 'submissions' && (
                    <div className="bg-[#121212] rounded-xl border border-white/10 overflow-hidden">
                        {submissionsLoading ? (
                            <div className="p-4 space-y-2">
                                {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}
                            </div>
                        ) : submissions.length === 0 ? (
                            <div className="text-center py-12">
                                <FileText className="mx-auto text-[#333] mb-3" size={48} />
                                <p className="text-[#666]">No submissions yet</p>
                            </div>
                        ) : (
                            <>
                                <div className="flex flex-wrap items-center gap-3 p-4 border-b border-white/10 bg-[#0d0d0d]">
                                    <Filter size={16} className="text-[#666]" />
                                    <select
                                        value={verdictFilter}
                                        onChange={(e) => setVerdictFilter(e.target.value as any)}
                                        className="bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                                    >
                                        <option value="all">All Verdicts</option>
                                        <option value="accepted">✓ Accepted</option>
                                        <option value="wrong">✗ Wrong</option>
                                    </select>
                                    <select
                                        value={problemFilter}
                                        onChange={(e) => setProblemFilter(e.target.value)}
                                        className="bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                                    >
                                        <option value="all">All Problems</option>
                                        {uniqueProblems.map(p => <option key={p} value={p}>Problem {p}</option>)}
                                    </select>
                                    <div className="w-px h-6 bg-white/10" />
                                    <ArrowUpDown size={16} className="text-[#666]" />
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value as any)}
                                        className="bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                                    >
                                        <option value="date">Date</option>
                                        <option value="time">Runtime</option>
                                        <option value="memory">Memory</option>
                                        <option value="problem">Problem</option>
                                    </select>
                                    <button
                                        onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                                        className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs"
                                    >
                                        {sortOrder === 'desc' ? '↓ Desc' : '↑ Asc'}
                                    </button>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-white/10 text-[#666] text-left">
                                                <th className="px-4 py-3 font-medium">When</th>
                                                <th className="px-4 py-3 font-medium">Problem</th>
                                                <th className="px-4 py-3 font-medium">Source</th>
                                                <th className="px-4 py-3 font-medium">Verdict</th>
                                                <th className="px-4 py-3 font-medium">Time</th>
                                                <th className="px-4 py-3 font-medium">Memory</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredSubmissions.map((sub) => (
                                                <tr
                                                    key={`${sub.source}-${sub.id}`}
                                                    className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                                                    onClick={() => viewSubmissionCode(sub)}
                                                >
                                                    <td className="px-4 py-3 text-[#808080] whitespace-nowrap">{formatDate(sub.submittedAt)}</td>
                                                    <td className="px-4 py-3">
                                                        <span className="text-[#E8C15A] font-medium">{sub.problemId}</span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {sub.source === 'codeforces' ? (
                                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-[10px] font-medium text-blue-400">CF</span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-medium text-emerald-400">Judge</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`flex items-center gap-1.5 font-medium ${getVerdictStyle(sub.verdict)}`}>
                                                            {getVerdictIcon(sub.verdict)}
                                                            {sub.verdict}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-[#808080]">{sub.timeMs > 0 ? `${sub.timeMs} ms` : '-'}</td>
                                                    <td className="px-4 py-3 text-[#808080]">{sub.memoryKb > 0 ? `${Math.round(sub.memoryKb / 1024)} KB` : '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Code Viewer Modal */}
            {(selectedSubmission || loadingCode) && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setSelectedSubmission(null)}>
                    <div className="bg-[#1a1a1a] rounded-xl border border-white/10 shadow-2xl w-[98%] h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        {loadingCode ? (
                            <div className="flex-1 p-6 space-y-3">
                                <Skeleton className="h-6 w-48 rounded" />
                                <Skeleton className="h-[70vh] w-full rounded-xl" />
                            </div>
                        ) : selectedSubmission && (
                            <>
                                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#1a1a1a]">
                                    <div>
                                        <h3 className="text-xl font-bold text-white">
                                            {selectedSubmission.source === 'codeforces' ? 'CF' : 'Judge0'} Submission #{selectedSubmission.id}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-1 text-sm text-[#888]">
                                            <span>Problem {selectedSubmission.problemId}</span>
                                            {selectedSubmission.attemptNumber && <span>• Attempt #{selectedSubmission.attemptNumber}</span>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className={`px-4 py-1.5 rounded-full text-sm font-medium ${selectedSubmission.verdict === 'Accepted' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                            {selectedSubmission.verdict}
                                        </span>
                                        <button onClick={() => setSelectedSubmission(null)} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-[#888] hover:text-white">
                                            <XCircle size={24} />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex-1 bg-[#1e1e1e]">
                                    <Editor
                                        height="100%"
                                        defaultLanguage="cpp"
                                        theme="vs-dark"
                                        value={selectedSubmission.sourceCode}
                                        options={{ readOnly: true, minimap: { enabled: false }, fontSize: 14, automaticLayout: true, padding: { top: 32, bottom: 32 } }}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } 
                .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
            `}</style>
        </>
    );
}
