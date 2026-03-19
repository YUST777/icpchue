'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getDisplayName } from '@/lib/utils';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { HeroSection } from '@/components/dashboard/HeroSection';
import { ProgressRing } from '@/components/dashboard/ProgressRing';
import { ActivityCalendar } from '@/components/dashboard/ActivityCalendar';
import { StatsFooter } from '@/components/dashboard/StatsFooter';
import DashboardOnboardingTour from '@/components/onboarding/DashboardOnboardingTour';

export default function DashboardHome() {
    const { user, profile } = useAuth();
    const { stats, loading, calendarWeeks, todayStr, totalSubmissions } = useDashboardStats();

    // Dashboard tutorial force state for manual trigger
    const [forceShowTour, setForceShowTour] = useState(false);

    // User info
    const displayName = getDisplayName(profile?.name) || user?.email?.split('@')[0] || 'Member';
    const firstName = displayName.split(' ')[0];
    const rank = profile?.codeforces_data?.rank || 'Unrated';

    // Dynamic progress from current sheet
    const sheet = stats.currentSheet;
    const progress = loading ? 0 : (sheet?.solvedCount ?? 0);
    const total = sheet?.totalProblems ?? 0;
    const sheetLabel = sheet ? `Sheet ${sheet.letter}: ${sheet.name}` : 'No sheet started';

    return (
        <div className="w-full max-w-[100vw] animate-fade-in space-y-5 pb-4 md:pb-0">
            {/* Dashboard Onboarding Tour */}
            <DashboardOnboardingTour forceShow={forceShowTour} onComplete={() => setForceShowTour(false)} delay={1500} />

            {/* Hero Section */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 lg:gap-16">
                <HeroSection
                    firstName={firstName}
                    sheetHref={sheet ? `/dashboard/sheets/${sheet.levelSlug}/${sheet.slug}` : '/dashboard/sheets'}
                />
                <ProgressRing
                    progress={progress}
                    total={total}
                    label={sheetLabel}
                    href={sheet ? `/dashboard/sheets/${sheet.levelSlug}/${sheet.slug}` : '/dashboard/sheets'}
                />
            </div>

            {/* Activity Calendar */}
            <ActivityCalendar
                weeks={calendarWeeks}
                totalSubmissions={totalSubmissions}
                todayStr={todayStr}
            />

            {/* Stats Footer & Help */}
            <div className="flex flex-col gap-4">
                <StatsFooter
                    streak={stats.streak}
                    totalSolved={stats.totalSolved}
                    rank={rank}
                    loading={loading}
                    studentId={profile?.student_id}
                />

                <div className="flex justify-center pb-4">
                    <button
                        onClick={() => setForceShowTour(true)}
                        className="text-xs text-white/30 hover:text-[#d59928] transition-colors flex items-center gap-1.5"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        إزاي تستخدم الداشبورد؟
                    </button>
                </div>
            </div>

            {/* Global animations */}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
            `}</style>
        </div>
    );
}
