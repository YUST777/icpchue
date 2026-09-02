'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
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
                <div className="h-16 bg-[#121214] border border-white/5 rounded-xl animate-pulse" />
                <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="h-16 bg-[#121214] border border-white/5 rounded-xl animate-pulse" />
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
        recent_submissions, 
        code_catalog, 
        user_notes, 
        flagged_problems, 
        behavioral_analysis 
    } = data;

    return (
        <div className="min-h-screen bg-[#0B0B0C] text-white p-3 md:p-6 space-y-3 max-w-7xl mx-auto animate-fade-in">
            {/* 1. Compact Hero Bar */}
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

                    {/* Split: Sheet Progress + Recent Submissions */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                        <div className="lg:col-span-6">
                            <SheetProgressBreakdown sheets={sheet_progress || []} />
                        </div>
                        <div className="lg:col-span-6">
                            <RecentSubmissionsTable submissions={recent_submissions || []} />
                        </div>
                    </div>
                </div>
            )}

            {/* Tab 2: Progress Matrix */}
            {activeTab === 'progress' && (
                <div className="bg-[#121214] border border-white/[0.08] rounded-xl p-4 space-y-3">
                    <h2 className="text-xs font-bold text-white tracking-wider uppercase">Full Curriculum Progress Breakdown</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {sheet_progress.map((sheet: any) => (
                            <div key={sheet.id} className="bg-white/[0.02] border border-white/5 rounded-lg p-3 space-y-1.5">
                                <div className="flex items-center justify-between text-xs">
                                    <div>
                                        <span className="font-bold text-[#E8C15A] mr-1.5">{sheet.sheet_letter}</span>
                                        <span className="text-white font-semibold">{sheet.name}</span>
                                    </div>
                                    <span className="font-bold text-[#E8C15A]">
                                        {sheet.solved}/{sheet.total_problems} ({sheet.progress_percentage}%)
                                    </span>
                                </div>
                                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden flex">
                                    <div style={{ width: `${sheet.progress_percentage}%` }} className="h-full bg-[#E8C15A]" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Tab 3: Submissions Feed */}
            {activeTab === 'submissions' && (
                <div className="space-y-3">
                    <RecentSubmissionsTable submissions={recent_submissions || []} />
                </div>
            )}

            {/* Tab 4: Dedicated Code & Workspaces Inspector */}
            {activeTab === 'workspace' && (
                <div className="space-y-3">
                    <CodeWorkspaceInspector 
                        codeCatalog={code_catalog || []} 
                        userNotes={user_notes || []} 
                    />
                </div>
            )}

            {/* Tab 5: Student Notes */}
            {activeTab === 'notes' && (
                <div className="space-y-3">
                    <QuickNotesWidget notes={user_notes || []} />
                </div>
            )}

            {/* Tab 6: Full-Width Activity Heatmap */}
            {activeTab === 'activity' && (
                <div className="space-y-3">
                    <ActivityHeatmap90Days data={heatmap_data || []} />
                </div>
            )}

            {/* Tab 7: Warnings & Flags Audit Trail */}
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
