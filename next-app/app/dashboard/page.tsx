'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, HelpCircle, Zap } from 'lucide-react';
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

            {/* New feature announcement */}
            <Link
                href="/dashboard/settings#codeforces-backfill"
                className="group relative block overflow-hidden rounded-2xl border border-[#E8C15A]/35 bg-gradient-to-r from-[#E8C15A]/15 via-[#171514] to-[#121212] p-4 shadow-[0_0_28px_rgba(232,193,90,0.1)] transition-all hover:border-[#E8C15A]/70 hover:shadow-[0_0_34px_rgba(232,193,90,0.18)] md:p-5"
            >
                <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-[#E8C15A]/10 blur-3xl transition-all group-hover:bg-[#E8C15A]/20" />
                <div className="relative flex items-center gap-3 md:gap-4">
                    <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#E8C15A]/40 bg-[#E8C15A]/15 text-[#E8C15A]">
                        <Zap size={22} />
                        <span className="absolute -right-3 -top-2 rounded-full bg-[#E8C15A] px-1.5 py-0.5 text-[9px] font-black leading-none text-[#0B0B0C] shadow-[0_0_12px_rgba(232,193,90,0.6)]">NEW</span>
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-[#F2F2F2] md:text-base">Accurate tries are here</p>
                        <p className="mt-0.5 text-xs text-[#B6A878] md:text-sm">Sync your full Codeforces history automatically every six hours.</p>
                    </div>
                    <ArrowRight size={18} className="shrink-0 text-[#E8C15A] transition-transform group-hover:translate-x-1" />
                </div>
            </Link>

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
                        <HelpCircle className="w-3.5 h-3.5" />
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
