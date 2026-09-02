'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    AlertTriangle, ShieldAlert, CheckCircle2, 
    RefreshCw, Terminal, Eye, FileCode
} from 'lucide-react';
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
            <div className="min-h-screen bg-[#0B0B0C] text-white p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
                <div className="h-44 bg-[#121214] border border-white/5 rounded-2xl animate-pulse" />
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3.5">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="h-24 bg-[#121214] border border-white/5 rounded-2xl animate-pulse" />
                    ))}
                </div>
                <div className="h-96 bg-[#121214] border border-white/5 rounded-2xl animate-pulse" />
            </div>
        );
    }

    if (!data || !data.profile) {
        return (
            <div className="min-h-screen bg-[#0B0B0C] text-white p-4 md:p-8 flex flex-col items-center justify-center space-y-4">
                <div className="p-4 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
                    <AlertTriangle size={32} />
                </div>
                <h1 className="text-xl font-bold text-white">Trainee Not Found</h1>
                <p className="text-sm text-white/50">No trainee records matched identifier: {studentIdParam}</p>
                <button
                    onClick={() => router.push('/dashboard/mentor')}
                    className="px-4 py-2 rounded-xl bg-[#E8C15A] text-black font-semibold text-xs transition-all hover:bg-[#d4ad45]"
                >
                    Return to Trainees Directory
                </button>
            </div>
        );
    }

    const { profile, metrics, sheet_progress, heatmap_data, recent_submissions, code_inspector, quick_notes, achievements, behavioral_analysis } = data;

    return (
        <div className="min-h-screen bg-[#0B0B0C] text-white p-4 md:p-8 space-y-6 max-w-7xl mx-auto animate-fade-in">
            {/* 1. Trainee Hero Header */}
            <TraineeHeroHeader 
                profile={profile} 
                lastSolveAt={metrics.last_solve_at} 
            />

            {/* 2. Key Metric Stat Cards */}
            <TraineeMetricCards metrics={metrics} />

            {/* 3. Navigation Tabs */}
            <TraineeTabNav 
                activeTab={activeTab} 
                onChange={setActiveTab} 
                flagsCount={profile.cheating_flags || 0}
            />

            {/* 4. Tab Contents */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    {/* Row 1: Sheet Progress Overview + Activity Heatmap */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <div className="lg:col-span-6">
                            <SheetProgressBreakdown sheets={sheet_progress || []} />
                        </div>
                        <div className="lg:col-span-6">
                            <ActivityHeatmap90Days data={heatmap_data || []} />
                        </div>
                    </div>

                    {/* Row 2: Recent Submissions Table */}
                    <div>
                        <RecentSubmissionsTable 
                            submissions={recent_submissions || []} 
                            onSelectSubmission={(sub) => setSelectedSub(sub)}
                        />
                    </div>

                    {/* Row 3: Live Code Inspector */}
                    <div>
                        <CodeInspectorPane 
                            draftCode={selectedSub?.source_code || code_inspector?.current_draft?.code}
                            lastSubCode={recent_submissions?.[0]?.source_code}
                            problemTitle={selectedSub?.problem || (code_inspector?.current_draft ? `${code_inspector.current_draft.contest_id || ''} ${code_inspector.current_draft.problem_id || ''}`.trim() : 'Current Problem')}
                            sheetName={selectedSub?.sheet_id ? `Sheet ${selectedSub.sheet_id}` : 'Training Sheet'}
                            language={selectedSub?.language || code_inspector?.current_draft?.language || 'C++'}
                            testOutput={code_inspector?.test_output}
                            customTestCases={data.custom_tests?.[0]?.test_cases || []}
                        />
                    </div>

                    {/* Row 4: Quick Notes + Gamified Achievements */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <div className="lg:col-span-5">
                            <QuickNotesWidget notes={quick_notes || []} />
                        </div>
                        <div className="lg:col-span-7">
                            <AchievementBadgeList achievements={achievements || []} />
                        </div>
                    </div>
                </div>
            )}

            {/* Tab: Progress Matrix */}
            {activeTab === 'progress' && (
                <div className="bg-[#121214] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-6">
                    <h2 className="text-lg font-bold text-white tracking-tight">Full Curriculum Progress Matrix</h2>
                    <div className="space-y-4">
                        {sheet_progress.map((sheet: any) => (
                            <div key={sheet.id} className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-2">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="font-bold text-[#E8C15A] mr-2">{sheet.sheet_letter}</span>
                                        <span className="text-white font-semibold">{sheet.name}</span>
                                    </div>
                                    <span className="text-xs font-bold text-emerald-400">
                                        {sheet.solved} / {sheet.total_problems} Solved ({sheet.progress_percentage}%)
                                    </span>
                                </div>
                                <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden flex">
                                    <div style={{ width: `${sheet.progress_percentage}%` }} className="h-full bg-emerald-400 rounded-full" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Tab: Submissions */}
            {activeTab === 'submissions' && (
                <div className="space-y-6">
                    <RecentSubmissionsTable 
                        submissions={recent_submissions || []} 
                        onSelectSubmission={(sub) => setSelectedSub(sub)}
                    />
                </div>
            )}

            {/* Tab: Code & Workspaces */}
            {activeTab === 'workspace' && (
                <div className="space-y-6">
                    <CodeInspectorPane 
                        draftCode={code_inspector?.current_draft?.code}
                        lastSubCode={recent_submissions?.[0]?.source_code}
                        problemTitle={code_inspector?.current_draft ? `${code_inspector.current_draft.contest_id || ''} ${code_inspector.current_draft.problem_id || ''}`.trim() : 'Live Workspace'}
                        testOutput={code_inspector?.test_output}
                        customTestCases={data.custom_tests?.[0]?.test_cases || []}
                    />
                </div>
            )}

            {/* Tab: Notes */}
            {activeTab === 'notes' && (
                <div className="space-y-6">
                    <QuickNotesWidget notes={quick_notes || []} />
                </div>
            )}

            {/* Tab: Activity */}
            {activeTab === 'activity' && (
                <div className="space-y-6">
                    <ActivityHeatmap90Days data={heatmap_data || []} />
                </div>
            )}

            {/* Tab: Achievements */}
            {activeTab === 'achievements' && (
                <div className="space-y-6">
                    <AchievementBadgeList achievements={achievements || []} />
                </div>
            )}

            {/* Tab: Warnings & Flags (Behavioral Telemetry) */}
            {activeTab === 'flags' && (
                <div className="bg-[#121214] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-6">
                    <div className="flex items-center gap-2 text-red-400 font-bold text-lg">
                        <ShieldAlert size={22} />
                        <h2>Integrity & Anti-Cheat Behavioral Analysis</h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
                            <span className="text-[10px] uppercase font-bold text-white/40 block">Cheating Flags</span>
                            <div className="text-2xl font-black text-red-400 mt-1">{behavioral_analysis.cheating_flags}</div>
                            <span className="text-xs text-white/50 mt-0.5 block">Recorded system flags</span>
                        </div>
                        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
                            <span className="text-[10px] uppercase font-bold text-white/40 block">First-Try AC Rate</span>
                            <div className="text-2xl font-black text-white mt-1">{behavioral_analysis.first_try_rate_pct}%</div>
                            <span className="text-xs text-white/50 mt-0.5 block">Normal range is 40%-70%</span>
                        </div>
                        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
                            <span className="text-[10px] uppercase font-bold text-white/40 block">Suspicious Fast Solves</span>
                            <div className="text-2xl font-black text-amber-400 mt-1">{behavioral_analysis.suspicious_fast_solves}</div>
                            <span className="text-xs text-white/50 mt-0.5 block">&lt; 60s from problem view</span>
                        </div>
                    </div>

                    {profile.is_shadow_banned && (
                        <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 flex items-center gap-3">
                            <AlertTriangle size={20} className="text-purple-400 shrink-0" />
                            <div className="text-xs text-purple-200">
                                <strong className="block text-sm text-purple-300 font-bold mb-0.5">Trainee is Currently Shadow Banned</strong>
                                This account's solves and rank are hidden from public community leaderboards.
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
