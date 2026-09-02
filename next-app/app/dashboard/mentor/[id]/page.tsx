'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AlertTriangle, ChevronDown, ChevronRight, CheckCircle2, Clock, Circle, Search } from 'lucide-react';
import { TraineeHeroHeader } from '@/components/dashboard/mentor/TraineeHeroHeader';
import { TraineeMetricCards } from '@/components/dashboard/mentor/TraineeMetricCards';
import { TraineeTabNav, TabId } from '@/components/dashboard/mentor/TraineeTabNav';
import { SheetProgressBreakdown } from '@/components/dashboard/mentor/SheetProgressBreakdown';
import { ActivityHeatmap90Days } from '@/components/dashboard/mentor/ActivityHeatmap90Days';
import { RecentSubmissionsTable } from '@/components/dashboard/mentor/RecentSubmissionsTable';
import { CodeWorkspaceInspector } from '@/components/dashboard/mentor/CodeWorkspaceInspector';
import { QuickNotesWidget } from '@/components/dashboard/mentor/QuickNotesWidget';
import { FlaggedProblemsView } from '@/components/dashboard/mentor/FlaggedProblemsView';

export default function TraineeDossierPage() {
    const params = useParams();
    const router = useRouter();
    const studentIdParam = params?.id as string;

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabId>('overview');
    const [expandedSheetId, setExpandedSheetId] = useState<number | string | null>(null);
    const [progressSearch, setProgressSearch] = useState('');
    const [selectedLevelId, setSelectedLevelId] = useState<string>('1');

    // Submissions pagination
    const [submissionsList, setSubmissionsList] = useState<any[]>([]);
    const [loadingMoreSubs, setLoadingMoreSubs] = useState(false);

    const fetchDossier = async () => {
        if (!studentIdParam) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/mentor/trainee/${studentIdParam}?sub_limit=100&sub_offset=0`);
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
            const res = await fetch(`/api/mentor/trainee/${studentIdParam}?sub_limit=100&sub_offset=${offset}`);
            if (res.ok) {
                const resData = await res.json();
                const newSubs = resData.recent_submissions || [];
                setSubmissionsList(prev => [...prev, ...newSubs]);
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

    const filteredSheets = useMemo(() => {
        if (!data?.sheet_progress) return [];
        let list = data.sheet_progress;

        if (selectedLevelId !== 'all') {
            list = list.filter((s: any) => String(s.level_id) === selectedLevelId);
        }

        if (progressSearch.trim()) {
            const q = progressSearch.toLowerCase();
            list = list.filter((s: any) => {
                const matchSheet = s.name.toLowerCase().includes(q) || s.sheet_letter.toLowerCase().includes(q);
                const matchProb = s.problems?.some((p: any) => p.title.toLowerCase().includes(q) || p.problem_letter.toLowerCase().includes(q));
                return matchSheet || matchProb;
            });
        }

        return list;
    }, [data?.sheet_progress, selectedLevelId, progressSearch]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0B0B0C] text-white p-3 md:p-6 space-y-3 max-w-7xl mx-auto">
                <div className="h-14 bg-[#121214] border border-white/5 rounded-xl animate-pulse" />
                <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="h-14 bg-[#121214] border border-white/5 rounded-xl animate-pulse" />
                    ))}
                </div>
                <div className="h-64 bg-[#121214] border border-white/5 rounded-xl animate-pulse" />
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
        user_notes, 
        flagged_problems, 
        behavioral_analysis,
        submissions_total
    } = data;

    const hasMoreSubmissions = submissionsList.length < (submissions_total || 0);

    return (
        <div className="min-h-screen bg-[#0B0B0C] text-white p-3 md:p-6 space-y-3 max-w-7xl mx-auto animate-fade-in">
            {/* 1. Sleek Compact Hero Bar */}
            <TraineeHeroHeader 
                profile={profile} 
                lastSolveAt={metrics.last_solve_at} 
            />

            {/* 2. Compact 6 KPI Metric Stat Cards */}
            <TraineeMetricCards metrics={metrics} />

            {/* 3. Navigation Tabs */}
            <TraineeTabNav 
                activeTab={activeTab} 
                onChange={setActiveTab} 
                flagsCount={behavioral_analysis.cheating_flags || 0}
            />

            {/* 4. Tab Contents */}

            {/* Tab 1: Overview */}
            {activeTab === 'overview' && (
                <div className="space-y-3">
                    {/* Full-Width Expansive Activity Heatmap in Yellow/Gold */}
                    <ActivityHeatmap90Days data={heatmap_data || []} />

                    {/* Split: Sheet Progress Matrix + Recent Submissions */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                        <div className="lg:col-span-6">
                            <SheetProgressBreakdown sheets={sheet_progress?.filter((s: any) => String(s.level_id) === '1') || []} />
                        </div>
                        <div className="lg:col-span-6">
                            <RecentSubmissionsTable 
                                submissions={submissionsList.slice(0, 15)} 
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Tab 2: Full Curriculum Progress Breakdown with Minimalist Level Switcher & Search Bar */}
            {activeTab === 'progress' && (
                <div className="bg-[#121214] border border-white/[0.08] rounded-xl p-3.5 space-y-3 shadow-md">
                    {/* Minimalist Top Control Bar (No verbose titles) */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-white/5">
                        {/* Minimalist Level Pills */}
                        <div className="flex items-center bg-[#0B0B0C] rounded-lg p-0.5 border border-white/10 text-xs">
                            <button
                                onClick={() => setSelectedLevelId('1')}
                                className={`px-3 py-1 rounded-md font-semibold transition-all ${
                                    selectedLevelId === '1' ? 'bg-[#E8C15A] text-black shadow-xs' : 'text-white/60 hover:text-white'
                                }`}
                            >
                                Lv 1
                            </button>
                            <button
                                onClick={() => setSelectedLevelId('2')}
                                className={`px-3 py-1 rounded-md font-semibold transition-all ${
                                    selectedLevelId === '2' ? 'bg-[#E8C15A] text-black shadow-xs' : 'text-white/60 hover:text-white'
                                }`}
                            >
                                Lv 2
                            </button>
                            <button
                                onClick={() => setSelectedLevelId('3')}
                                className={`px-3 py-1 rounded-md font-semibold transition-all ${
                                    selectedLevelId === '3' ? 'bg-[#E8C15A] text-black shadow-xs' : 'text-white/60 hover:text-white'
                                }`}
                            >
                                Lv 3
                            </button>
                            <button
                                onClick={() => setSelectedLevelId('all')}
                                className={`px-3 py-1 rounded-md font-semibold transition-all ${
                                    selectedLevelId === 'all' ? 'bg-[#E8C15A] text-black shadow-xs' : 'text-white/60 hover:text-white'
                                }`}
                            >
                                All
                            </button>
                        </div>

                        {/* Minimalist Search Bar */}
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30 w-3.5 h-3.5" />
                            <input
                                value={progressSearch}
                                onChange={(e) => setProgressSearch(e.target.value)}
                                placeholder="Search sheet or problem..."
                                className="w-full bg-[#0B0B0C] border border-white/10 rounded-lg pl-8 pr-3 py-1 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#E8C15A] transition-colors"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        {filteredSheets.length === 0 ? (
                            <div className="text-center py-8 text-xs text-white/30">
                                No sheets or problems matched your filter.
                            </div>
                        ) : (
                            filteredSheets.map((sheet: any, index: number) => {
                                const isExpanded = expandedSheetId === (sheet.id || index) || Boolean(progressSearch.trim());
                                const solvedPct = Math.min(100, Math.round((sheet.solved / (sheet.total_problems || 1)) * 100));
                                const attemptedPct = Math.min(100, Math.round((sheet.attempted / (sheet.total_problems || 1)) * 100));

                                return (
                                    <div key={sheet.id || index} className="rounded-xl border border-white/5 bg-white/[0.01] overflow-hidden transition-all">
                                        {/* Sheet Header Row */}
                                        <div 
                                            onClick={() => toggleSheet(sheet.id || index)}
                                            className="p-3 flex flex-wrap items-center justify-between cursor-pointer hover:bg-white/[0.03] transition-colors gap-2"
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
                                                    <strong className="text-[#E8C15A] font-bold">{sheet.solved}</strong>
                                                    <span>/{sheet.total_problems} Solved</span>
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

                                        {/* Expanded Problems Grid */}
                                        {isExpanded && sheet.problems && sheet.problems.length > 0 && (
                                            <div className="p-3 bg-black/40 border-t border-white/5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                                {sheet.problems.map((p: any) => {
                                                    const isSolved = p.status === 'SOLVED';
                                                    const isAttempted = p.status === 'ATTEMPTED';

                                                    return (
                                                        <div 
                                                            key={p.id}
                                                            className={`p-2 rounded-lg text-xs flex items-center justify-between border transition-all ${
                                                                isSolved
                                                                    ? 'bg-[#E8C15A]/10 border-[#E8C15A]/30 text-white'
                                                                    : isAttempted
                                                                    ? 'bg-amber-500/10 border-amber-500/30 text-white/90'
                                                                    : 'bg-white/[0.02] border-white/5 text-white/40'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-2 truncate pr-1">
                                                                {isSolved ? (
                                                                    <CheckCircle2 size={12} className="text-[#E8C15A] shrink-0" />
                                                                ) : isAttempted ? (
                                                                    <Clock size={12} className="text-amber-400 shrink-0" />
                                                                ) : (
                                                                    <Circle size={10} className="text-white/20 shrink-0" />
                                                                )}
                                                                <span className="font-bold text-[#E8C15A]">{p.problem_letter}.</span>
                                                                <span className="truncate font-medium">{p.title}</span>
                                                            </div>
                                                            <span className={`text-[9px] font-bold uppercase shrink-0 ${
                                                                isSolved ? 'text-[#E8C15A]' : isAttempted ? 'text-amber-400' : 'text-white/30'
                                                            }`}>
                                                                {isSolved ? 'Solved' : isAttempted ? 'Attempted' : 'Not Started'}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {/* Tab 3: Submissions Feed with Pagination and Modal Preview */}
            {activeTab === 'submissions' && (
                <div className="space-y-3">
                    <RecentSubmissionsTable 
                        submissions={submissionsList}
                        onLoadMore={loadMoreSubmissions}
                        hasMore={hasMoreSubmissions}
                        loadingMore={loadingMoreSubs}
                    />
                </div>
            )}

            {/* Tab 4: Clean Code Inspector */}
            {activeTab === 'workspace' && (
                <div className="space-y-3">
                    <CodeWorkspaceInspector codeCatalog={code_catalog || []} />
                </div>
            )}

            {/* Tab 5: Student Notes */}
            {activeTab === 'notes' && (
                <div className="space-y-3">
                    <QuickNotesWidget notes={user_notes || []} />
                </div>
            )}

            {/* Tab 6: Warnings & Flags Audit Trail */}
            {activeTab === 'flags' && (
                <div className="space-y-3">
                    <FlaggedProblemsView 
                        flaggedProblems={flagged_problems || []} 
                        totalFlags={behavioral_analysis.cheating_flags || 0}
                        isShadowBanned={profile.is_shadow_banned || false}
                        cfHandle={profile.codeforces_handle}
                    />
                </div>
            )}
        </div>
    );
}
