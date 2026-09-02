'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    AlertTriangle, ChevronDown, ChevronRight, CheckCircle2, 
    XCircle, Clock, Circle, Search, BarChart3, HardDrive 
} from 'lucide-react';
import { TraineeProfileCard } from '@/components/dashboard/mentor/TraineeProfileCard';
import { TraineeTabNav, TabId } from '@/components/dashboard/mentor/TraineeTabNav';
import { SheetProgressBreakdown } from '@/components/dashboard/mentor/SheetProgressBreakdown';
import { ActivityHeatmap90Days } from '@/components/dashboard/mentor/ActivityHeatmap90Days';
import { RecentSubmissionsTable } from '@/components/dashboard/mentor/RecentSubmissionsTable';
import { CodeWorkspaceInspector } from '@/components/dashboard/mentor/CodeWorkspaceInspector';
import { FlaggedProblemsView } from '@/components/dashboard/mentor/FlaggedProblemsView';

export default function TraineeDossierPage() {
    const params = useParams();
    const router = useRouter();
    const rawIdParam = params?.id as string;
    const studentIdParam = rawIdParam ? decodeURIComponent(rawIdParam) : '';

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabId>('overview');
    const [expandedSheetId, setExpandedSheetId] = useState<number | string | null>(null);
    const [progressSearch, setProgressSearch] = useState('');
    const [selectedLevelId, setSelectedLevelId] = useState<string>('1');
    const [timeHorizon, setTimeHorizon] = useState<'all' | '24h' | '7d' | '30d' | '90d'>('all');

    // Submissions pagination with deduplication
    const [submissionsList, setSubmissionsList] = useState<any[]>([]);
    const [loadingMoreSubs, setLoadingMoreSubs] = useState(false);

    const fetchDossier = async () => {
        if (!studentIdParam) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/mentor/trainee/${encodeURIComponent(studentIdParam)}?sub_limit=100&sub_offset=0`);
            if (res.ok) {
                const resData = await res.json();
                setData(resData);
                setSubmissionsList(resData.recent_submissions || []);
            } else if (res.status === 403) {
                router.replace('/dashboard');
            }
        } catch (err) {
            console.error('Failed to fetch trainee dossier:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadMoreSubmissions = async () => {
        if (loadingMoreSubs || !studentIdParam) return;
        setLoadingMoreSubs(true);
        try {
            const offset = submissionsList.length;
            const res = await fetch(`/api/mentor/trainee/${encodeURIComponent(studentIdParam)}?sub_limit=100&sub_offset=${offset}`);
            if (res.ok) {
                const resData = await res.json();
                const newSubs = resData.recent_submissions || [];
                setSubmissionsList(prev => {
                    const existingIds = new Set(prev.map(s => s.id));
                    const uniqueNew = newSubs.filter((s: any) => !existingIds.has(s.id));
                    return [...prev, ...uniqueNew];
                });
            }
        } catch (err) {
            console.error('Failed to load more submissions:', err);
        } finally {
            setLoadingMoreSubs(false);
        }
    };

    useEffect(() => {
        fetchDossier();
    }, [studentIdParam]);

    const toggleSheet = (id: number | string) => {
        setExpandedSheetId(expandedSheetId === id ? null : id);
    };

    const filteredSubmissionsList = useMemo(() => {
        if (timeHorizon === 'all') return submissionsList;
        const now = Date.now();
        const durationMap = {
            '24h': 24 * 60 * 60 * 1000,
            '7d': 7 * 24 * 60 * 60 * 1000,
            '30d': 30 * 24 * 60 * 60 * 1000,
            '90d': 90 * 24 * 60 * 60 * 1000,
        };
        const cutoff = now - durationMap[timeHorizon];
        return submissionsList.filter((s: any) => {
            const t = s.submitted_at ? new Date(s.submitted_at).getTime() : 0;
            return t >= cutoff;
        });
    }, [submissionsList, timeHorizon]);

    const filteredCodeCatalog = useMemo(() => {
        const catalog = data?.code_catalog || [];
        if (timeHorizon === 'all') return catalog;
        const now = Date.now();
        const durationMap = {
            '24h': 24 * 60 * 60 * 1000,
            '7d': 7 * 24 * 60 * 60 * 1000,
            '30d': 30 * 24 * 60 * 60 * 1000,
            '90d': 90 * 24 * 60 * 60 * 1000,
        };
        const cutoff = now - durationMap[timeHorizon];
        return catalog.filter((c: any) => {
            const t = c.updated_at ? new Date(c.updated_at).getTime() : 0;
            return t >= cutoff;
        });
    }, [data?.code_catalog, timeHorizon]);

    const filteredSheets = useMemo(() => {
        if (!data?.sheet_progress) return [];
        let list = data.sheet_progress;

        if (selectedLevelId !== 'all') {
            list = list.filter((s: any) => String(s.level_id || 1) === selectedLevelId);
        }

        if (progressSearch.trim()) {
            const q = progressSearch.toLowerCase();
            list = list.filter((s: any) => {
                const name = (s.name || '').toLowerCase();
                const letter = (s.sheet_letter || '').toLowerCase();
                const matchSheet = name.includes(q) || letter.includes(q);
                const matchProb = s.problems?.some((p: any) => {
                    const pTitle = (p.title || '').toLowerCase();
                    const pLetter = (p.problem_letter || '').toLowerCase();
                    return pTitle.includes(q) || pLetter.includes(q);
                });
                return matchSheet || matchProb;
            });
        }

        return list;
    }, [data?.sheet_progress, selectedLevelId, progressSearch]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0B0B0C] text-white p-3 md:p-6 space-y-3 max-w-7xl mx-auto">
                <div className="h-44 bg-[#121214] border border-white/5 rounded-2xl animate-pulse" />
                <div className="h-64 bg-[#121214] border border-white/5 rounded-2xl animate-pulse" />
            </div>
        );
    }

    if (!data || !data.profile) {
        return (
            <div className="min-h-screen bg-[#0B0B0C] text-white p-4 md:p-8 flex flex-col items-center justify-center space-y-3">
                <div className="p-3 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
                    <AlertTriangle size={24} />
                </div>
                <h1 className="text-base font-bold text-white">Trainee Not Found</h1>
                <p className="text-xs text-white/50">No trainee records matched identifier: {studentIdParam}</p>
                <button
                    onClick={() => router.push('/dashboard/mentor')}
                    className="px-3 py-1.5 rounded-lg bg-[#E8C15A] text-black font-semibold text-xs transition-all hover:bg-[#d4ad45]"
                >
                    Return to Trainees Directory
                </button>
            </div>
        );
    }

    const { 
        profile, 
        metrics, 
        sheet_progress, 
        heatmap_data, 
        code_catalog, 
        flagged_problems, 
        behavioral_analysis,
        submissions_total
    } = data;

    const hasMoreSubmissions = submissionsList.length < (submissions_total || 0);

    const renderProblemBadge = (prob: any) => {
        const st = prob.status;
        const attempts = prob.attempts > 0 ? ` (#${prob.attempts})` : '';

        if (st === 'SOLVED') {
            return (
                <div className="p-2.5 rounded-xl text-xs flex items-center justify-between border bg-[#E8C15A]/10 border-[#E8C15A]/30 text-white transition-all">
                    <div className="flex items-center gap-2 truncate pr-1">
                        <CheckCircle2 size={13} className="text-[#E8C15A] shrink-0" />
                        <span className="font-bold text-[#E8C15A]">{prob.problem_letter}.</span>
                        <span className="truncate font-medium">{prob.title}</span>
                    </div>
                    <span className="text-[10px] font-mono font-semibold text-[#E8C15A] shrink-0">
                        Accepted{attempts}
                    </span>
                </div>
            );
        }

        if (st === 'WRONG_ANSWER') {
            return (
                <div className="p-2.5 rounded-xl text-xs flex items-center justify-between border bg-red-500/10 border-red-500/30 text-white transition-all">
                    <div className="flex items-center gap-2 truncate pr-1">
                        <XCircle size={13} className="text-red-400 shrink-0" />
                        <span className="font-bold text-red-400">{prob.problem_letter}.</span>
                        <span className="truncate font-medium">{prob.title}</span>
                    </div>
                    <span className="text-[10px] font-mono font-semibold text-red-400 shrink-0">
                        Wrong Answer{attempts}
                    </span>
                </div>
            );
        }

        if (st === 'TIME_LIMIT') {
            return (
                <div className="p-2.5 rounded-xl text-xs flex items-center justify-between border bg-amber-500/10 border-amber-500/30 text-white transition-all">
                    <div className="flex items-center gap-2 truncate pr-1">
                        <Clock size={13} className="text-amber-400 shrink-0" />
                        <span className="font-bold text-amber-400">{prob.problem_letter}.</span>
                        <span className="truncate font-medium">{prob.title}</span>
                    </div>
                    <span className="text-[10px] font-mono font-semibold text-amber-400 shrink-0">
                        Time Limit{attempts}
                    </span>
                </div>
            );
        }

        if (st === 'MEMORY_LIMIT' || st === 'RUNTIME_ERROR') {
            return (
                <div className="p-2.5 rounded-xl text-xs flex items-center justify-between border bg-purple-500/10 border-purple-500/30 text-white transition-all">
                    <div className="flex items-center gap-2 truncate pr-1">
                        <AlertTriangle size={13} className="text-purple-400 shrink-0" />
                        <span className="font-bold text-purple-400">{prob.problem_letter}.</span>
                        <span className="truncate font-medium">{prob.title}</span>
                    </div>
                    <span className="text-[10px] font-mono font-semibold text-purple-300 shrink-0">
                        {st === 'MEMORY_LIMIT' ? 'Memory Limit' : 'Runtime Error'}{attempts}
                    </span>
                </div>
            );
        }

        if (st === 'ATTEMPTED') {
            return (
                <div className="p-2.5 rounded-xl text-xs flex items-center justify-between border bg-amber-500/10 border-amber-500/25 text-white/90 transition-all">
                    <div className="flex items-center gap-2 truncate pr-1">
                        <Clock size={13} className="text-amber-400 shrink-0" />
                        <span className="font-bold text-amber-400">{prob.problem_letter}.</span>
                        <span className="truncate font-medium">{prob.title}</span>
                    </div>
                    <span className="text-[10px] font-mono font-semibold text-amber-400 shrink-0">
                        Attempted{attempts}
                    </span>
                </div>
            );
        }

        // NOT_STARTED
        return (
            <div className="p-2.5 rounded-xl text-xs flex items-center justify-between border bg-white/[0.015] border-white/5 text-white/40 transition-all">
                <div className="flex items-center gap-2 truncate pr-1">
                    <Circle size={11} className="text-white/20 shrink-0" />
                    <span className="font-bold text-white/50">{prob.problem_letter}.</span>
                    <span className="truncate font-medium">{prob.title}</span>
                </div>
                <span className="text-[10px] font-mono text-white/30 shrink-0">
                    Not Started
                </span>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#0B0B0C] text-white p-3 md:p-6 space-y-3 max-w-7xl mx-auto animate-fade-in">
            {/* 1. Single Unified Profile & KPI Bento Widget */}
            <TraineeProfileCard 
                profile={profile} 
                metrics={metrics || {}} 
            />

            {/* 2. Navigation Tabs & Time Horizon Selector */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                <TraineeTabNav 
                    activeTab={activeTab} 
                    onChange={setActiveTab} 
                    flagsCount={behavioral_analysis?.cheating_flags || 0}
                />

                {/* Global Time Filter Pills */}
                <div className="flex items-center gap-1 bg-[#121214]/90 border border-white/[0.08] p-1 rounded-2xl backdrop-blur-xl shadow-xs self-end sm:self-auto">
                    <span className="text-[10px] text-white/40 uppercase font-mono px-2 flex items-center gap-1">
                        <Clock size={11} className="text-[#E8C15A]" /> Time:
                    </span>
                    {(['all', '24h', '7d', '30d', '90d'] as const).map((t) => {
                        const label = t === 'all' ? 'All' : (t === '24h' ? '24h' : (t === '7d' ? '7d' : (t === '30d' ? '30d' : '90d')));
                        const isActive = timeHorizon === t;
                        return (
                            <button
                                key={t}
                                type="button"
                                onClick={() => setTimeHorizon(t)}
                                className={`px-2.5 py-1 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                                    isActive
                                        ? 'text-[#E8C15A] bg-[#E8C15A]/15 border border-[#E8C15A]/30 font-semibold shadow-xs'
                                        : 'text-white/40 hover:text-white/80 border border-transparent'
                                }`}
                            >
                                {label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 3. Tab Contents */}

            {/* Tab 1: Overview */}
            {activeTab === 'overview' && (
                <div className="space-y-3">
                    {/* Full-Width Expansive Activity Heatmap in Yellow/Gold */}
                    <ActivityHeatmap90Days data={heatmap_data || []} />

                    {/* Split: Sheet Progress Matrix + Recent Submissions */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                        <div className="lg:col-span-6">
                            <SheetProgressBreakdown sheets={sheet_progress?.filter((s: any) => String(s.level_id || 1) === '1') || []} />
                        </div>
                        <div className="lg:col-span-6">
                            <RecentSubmissionsTable 
                                submissions={filteredSubmissionsList.slice(0, 15)} 
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Tab 2: Full Curriculum Progress Matrix with Minimalist Header & Level Pills */}
            {activeTab === 'progress' && (
                <div className="bg-[#121214]/90 border border-white/[0.08] rounded-2xl p-4 space-y-3 shadow-[0_4px_20px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
                    {/* Minimalist Widget Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-white/[0.06]">
                        <div className="flex items-center gap-2.5">
                            <div className="w-6 h-6 rounded-lg bg-[#E8C15A]/10 text-[#E8C15A] flex items-center justify-center">
                                <BarChart3 size={13} />
                            </div>
                            <h2 className="text-xs font-semibold text-white/90 tracking-tight">
                                Curriculum Progress Matrix
                            </h2>
                        </div>

                        {/* Minimalist Controls: Ultra-Thin Level Pills & Search */}
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-1">
                                {(['1', '2', '3', 'all'] as const).map((lvl) => {
                                    const label = lvl === 'all' ? 'All' : `Lv ${lvl}`;
                                    const isActive = selectedLevelId === lvl;
                                    return (
                                        <button
                                            key={lvl}
                                            onClick={() => setSelectedLevelId(lvl)}
                                            className={`px-2 py-0.5 rounded-md text-[11px] transition-all ${
                                                isActive
                                                    ? 'text-[#E8C15A] bg-[#E8C15A]/10 border border-[#E8C15A]/30 font-medium'
                                                    : 'text-white/40 hover:text-white/80 border border-transparent'
                                            }`}
                                        >
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Minimalist Search Bar */}
                            <div className="relative w-full sm:w-56">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30 w-3 h-3" />
                                <input
                                    value={progressSearch}
                                    onChange={(e) => setProgressSearch(e.target.value)}
                                    placeholder="Search sheet or problem..."
                                    className="w-full bg-[#0B0B0C] border border-white/10 rounded-lg pl-7 pr-2.5 py-1 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#E8C15A] transition-colors"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        {filteredSheets.length === 0 ? (
                            <div className="text-center py-8 text-xs text-white/30 font-mono">
                                No sheets or problems matched your filter.
                            </div>
                        ) : (
                            filteredSheets.map((sheet: any, index: number) => {
                                const isExpanded = expandedSheetId === (sheet.id || index) || Boolean(progressSearch.trim());
                                const total = sheet.total_problems || 0;
                                const solved = sheet.solved || 0;
                                const attempted = sheet.attempted || 0;
                                const solvedPct = total > 0 ? Math.min(100, Math.max(0, Math.round((solved / total) * 100))) : 0;
                                const attemptedPct = total > 0 ? Math.min(100, Math.max(0, Math.round((attempted / total) * 100))) : 0;

                                return (
                                    <div key={sheet.id || index} className="rounded-xl border border-white/[0.06] bg-white/[0.015] overflow-hidden transition-all">
                                        {/* Sheet Header Row */}
                                        <div 
                                            onClick={() => toggleSheet(sheet.id || index)}
                                            className="p-3 flex flex-wrap items-center justify-between cursor-pointer hover:bg-white/[0.03] active:bg-white/[0.05] transition-colors gap-2"
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                {isExpanded ? (
                                                    <ChevronDown size={14} className="text-[#E8C15A] shrink-0" />
                                                ) : (
                                                    <ChevronRight size={14} className="text-white/40 shrink-0" />
                                                )}
                                                <span className="font-bold text-[#E8C15A] text-xs">{sheet.sheet_letter}</span>
                                                <span className="text-white font-semibold text-xs truncate">{sheet.name}</span>
                                                <span className="text-[10px] text-white/40 bg-white/5 px-1.5 py-0.2 rounded font-mono">
                                                    {sheet.level_name}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-3 shrink-0">
                                                <div className="text-xs text-white/60">
                                                    <strong className="text-[#E8C15A] font-bold">{solved}</strong>
                                                    <span>/{total} Solved</span>
                                                </div>
                                                <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden flex">
                                                    {solvedPct > 0 && (
                                                        <div style={{ width: `${solvedPct}%` }} className="h-full bg-[#E8C15A]" />
                                                    )}
                                                    {attemptedPct > 0 && (
                                                        <div style={{ width: `${attemptedPct}%` }} className="h-full bg-amber-400" />
                                                    )}
                                                </div>
                                                <span className="text-xs font-bold text-white w-8 text-right">
                                                    {solvedPct}%
                                                </span>
                                            </div>
                                        </div>

                                        {/* Expanded Problems Grid (Showing exact situation / verdict for every problem) */}
                                        {isExpanded && sheet.problems && sheet.problems.length > 0 && (
                                            <div className="p-3 bg-black/40 border-t border-white/[0.06] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                                {sheet.problems.map((p: any) => (
                                                    <React.Fragment key={p.id}>
                                                        {renderProblemBadge(p)}
                                                    </React.Fragment>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {/* Tab 3: Submissions Feed */}
            {activeTab === 'submissions' && (
                <div className="space-y-3">
                    <RecentSubmissionsTable 
                        submissions={filteredSubmissionsList}
                        onLoadMore={loadMoreSubmissions}
                        hasMore={hasMoreSubmissions}
                        loadingMore={loadingMoreSubs}
                    />
                </div>
            )}

            {/* Tab 4: Clean Code Inspector */}
            {activeTab === 'workspace' && (
                <div className="space-y-3">
                    <CodeWorkspaceInspector codeCatalog={filteredCodeCatalog} />
                </div>
            )}

            {/* Tab 5: Warnings & Flags Audit Trail */}
            {activeTab === 'flags' && (
                <div className="space-y-3">
                    <FlaggedProblemsView 
                        flaggedProblems={flagged_problems || []} 
                        totalFlags={behavioral_analysis?.cheating_flags || 0}
                        isShadowBanned={profile.is_shadow_banned || false}
                        cfHandle={profile.codeforces_handle}
                    />
                </div>
            )}
        </div>
    );
}
