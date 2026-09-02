'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { TraineeHeroHeader } from '@/components/dashboard/mentor/TraineeHeroHeader';
import { TraineeMetricCards } from '@/components/dashboard/mentor/TraineeMetricCards';
import { TraineeTabNav, TabId } from '@/components/dashboard/mentor/TraineeTabNav';
import { SheetProgressBreakdown } from '@/components/dashboard/mentor/SheetProgressBreakdown';
import { ActivityHeatmap90Days } from '@/components/dashboard/mentor/ActivityHeatmap90Days';
import { RecentSubmissionsTable } from '@/components/dashboard/mentor/RecentSubmissionsTable';
import { CodeInspectorPane } from '@/components/dashboard/mentor/CodeInspectorPane';
import { QuickNotesWidget } from '@/components/dashboard/mentor/QuickNotesWidget';
import { AchievementBadgeList } from '@/components/dashboard/mentor/AchievementBadgeList';

export default function TraineeDossierPage() {
    const params = useParams();
    const router = useRouter();
    const studentIdParam = params?.id as string;

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabId>('overview');
    const [selectedSub, setSelectedSub] = useState<any>(null);

    const fetchDossier = async () => {
        if (!studentIdParam) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/mentor/trainee/${studentIdParam}`);
            if (res.ok) {
                const resData = await res.json();
                setData(resData);
            } else if (res.status === 403) {
                router.replace('/dashboard');
            }
        } catch (err) {
            console.error('Failed to fetch trainee dossier:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDossier();
    }, [studentIdParam]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0B0B0C] text-white p-3 md:p-6 space-y-3 max-w-7xl mx-auto">
                <div className="h-20 bg-[#121214] border border-white/5 rounded-xl animate-pulse" />
                <div className="grid grid-cols-2 md:grid-cols-6 gap-2.5">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="h-16 bg-[#121214] border border-white/5 rounded-xl animate-pulse" />
                    ))}
                </div>
                <div className="h-72 bg-[#121214] border border-white/5 rounded-xl animate-pulse" />
            </div>
        );
    }

    if (!data || !data.profile) {
        return (
            <div className="min-h-screen bg-[#0B0B0C] text-white p-4 md:p-8 flex flex-col items-center justify-center space-y-4">
                <div className="p-3 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
                    <AlertTriangle size={28} />
                </div>
                <h1 className="text-lg font-bold text-white">Trainee Not Found</h1>
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

    const { profile, metrics, sheet_progress, heatmap_data, recent_submissions, code_inspector, quick_notes, achievements, behavioral_analysis } = data;

    return (
        <div className="min-h-screen bg-[#0B0B0C] text-white p-3 md:p-6 space-y-3 max-w-7xl mx-auto animate-fade-in">
            {/* 1. Ultra-Compact Trainee Hero Header */}
            <TraineeHeroHeader 
                profile={profile} 
                lastSolveAt={metrics.last_solve_at} 
            />

            {/* 2. Compact 6 KPI Metric Stat Cards (Single Row) */}
            <TraineeMetricCards metrics={metrics} />

            {/* 3. Compact Tab Navigation */}
            <TraineeTabNav 
                activeTab={activeTab} 
                onChange={setActiveTab} 
                flagsCount={profile.cheating_flags || 0}
            />

            {/* 4. Tab 1: Bento Grid Layout */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                    {/* Left Column (5 Cols) */}
                    <div className="lg:col-span-5 space-y-3 flex flex-col">
                        {/* Bento 1: Sheet Progress Matrix */}
                        <SheetProgressBreakdown sheets={sheet_progress || []} />

                        {/* Bento 2: 90-Day Activity Heatmap */}
                        <ActivityHeatmap90Days data={heatmap_data || []} />

                        {/* Bento 3: Quick Notes */}
                        <QuickNotesWidget notes={quick_notes || []} />
                    </div>

                    {/* Right Column (7 Cols) */}
                    <div className="lg:col-span-7 space-y-3 flex flex-col">
                        {/* Bento 4: Live Code Inspector */}
                        <CodeInspectorPane 
                            draftCode={selectedSub?.source_code || code_inspector?.current_draft?.code}
                            lastSubCode={recent_submissions?.[0]?.source_code}
                            problemTitle={selectedSub?.problem || (code_inspector?.current_draft ? `${code_inspector.current_draft.contest_id || ''} ${code_inspector.current_draft.problem_id || ''}`.trim() : 'Current Problem')}
                            sheetName={selectedSub?.sheet_id ? `Sheet ${selectedSub.sheet_id}` : 'Training Sheet'}
                            testOutput={code_inspector?.test_output}
                        />

                        {/* Bento 5: Recent Submissions Feed */}
                        <RecentSubmissionsTable 
                            submissions={recent_submissions || []} 
                            onSelectSubmission={(sub) => setSelectedSub(sub)}
                        />

                        {/* Bento 6: Gamified Achievements */}
                        <AchievementBadgeList achievements={achievements || []} />
                    </div>
                </div>
            )}

            {/* Tab: Full Progress Matrix */}
            {activeTab === 'progress' && (
                <div className="bg-[#121214] border border-white/[0.08] rounded-xl p-4 space-y-3">
                    <h2 className="text-sm font-bold text-white tracking-tight uppercase">Full Curriculum Progress Matrix</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {sheet_progress.map((sheet: any) => (
                            <div key={sheet.id} className="bg-white/[0.02] border border-white/5 rounded-lg p-3 space-y-1.5">
                                <div className="flex items-center justify-between text-xs">
                                    <div>
                                        <span className="font-bold text-[#E8C15A] mr-1.5">{sheet.sheet_letter}</span>
                                        <span className="text-white font-semibold">{sheet.name}</span>
                                    </div>
                                    <span className="font-bold text-emerald-400">
                                        {sheet.solved}/{sheet.total_problems} ({sheet.progress_percentage}%)
                                    </span>
                                </div>
                                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden flex">
                                    <div style={{ width: `${sheet.progress_percentage}%` }} className="h-full bg-emerald-400" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Tab: Submissions Feed */}
            {activeTab === 'submissions' && (
                <div className="space-y-3">
                    <RecentSubmissionsTable 
                        submissions={recent_submissions || []} 
                        onSelectSubmission={(sub) => setSelectedSub(sub)}
                    />
                </div>
            )}

            {/* Tab: Live Workspaces */}
            {activeTab === 'workspace' && (
                <div className="space-y-3">
                    <CodeInspectorPane 
                        draftCode={code_inspector?.current_draft?.code}
                        lastSubCode={recent_submissions?.[0]?.source_code}
                        problemTitle={code_inspector?.current_draft ? `${code_inspector.current_draft.contest_id || ''} ${code_inspector.current_draft.problem_id || ''}`.trim() : 'Live Workspace'}
                        testOutput={code_inspector?.test_output}
                    />
                </div>
            )}

            {/* Tab: Notes */}
            {activeTab === 'notes' && (
                <div className="space-y-3">
                    <QuickNotesWidget notes={quick_notes || []} />
                </div>
            )}

            {/* Tab: Activity Heatmap */}
            {activeTab === 'activity' && (
                <div className="space-y-3">
                    <ActivityHeatmap90Days data={heatmap_data || []} />
                </div>
            )}

            {/* Tab: Achievements */}
            {activeTab === 'achievements' && (
                <div className="space-y-3">
                    <AchievementBadgeList achievements={achievements || []} />
                </div>
            )}

            {/* Tab: Warnings & Flags */}
            {activeTab === 'flags' && (
                <div className="bg-[#121214] border border-white/[0.08] rounded-xl p-4 space-y-4">
                    <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                        <ShieldAlert size={18} />
                        <h2>Integrity & Anti-Cheat Behavioral Analysis</h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="bg-white/[0.02] border border-white/5 rounded-lg p-3">
                            <span className="text-[9px] uppercase font-bold text-white/40 block">Cheating Flags</span>
                            <div className="text-xl font-black text-red-400 mt-0.5">{behavioral_analysis.cheating_flags}</div>
                            <span className="text-[10px] text-white/50 block">Recorded system flags</span>
                        </div>
                        <div className="bg-white/[0.02] border border-white/5 rounded-lg p-3">
                            <span className="text-[9px] uppercase font-bold text-white/40 block">First-Try AC Rate</span>
                            <div className="text-xl font-black text-white mt-0.5">{behavioral_analysis.first_try_rate_pct}%</div>
                            <span className="text-[10px] text-white/50 block">Normal range 40%-70%</span>
                        </div>
                        <div className="bg-white/[0.02] border border-white/5 rounded-lg p-3">
                            <span className="text-[9px] uppercase font-bold text-white/40 block">Fast Solves (&lt;60s)</span>
                            <div className="text-xl font-black text-amber-400 mt-0.5">{behavioral_analysis.suspicious_fast_solves}</div>
                            <span className="text-[10px] text-white/50 block">Unusual solve speed</span>
                        </div>
                    </div>

                    {profile.is_shadow_banned && (
                        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 flex items-center gap-2.5">
                            <AlertTriangle size={16} className="text-purple-400 shrink-0" />
                            <div className="text-xs text-purple-200">
                                <strong className="text-purple-300 font-bold">Trainee is Currently Shadow Banned</strong> — Hidden from leaderboards.
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
