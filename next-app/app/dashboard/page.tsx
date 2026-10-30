'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, HelpCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getDisplayName } from '@/lib/utils';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { HeroSection } from '@/components/dashboard/HeroSection';
import { ProgressRing } from '@/components/dashboard/ProgressRing';
import { ActivityCalendar } from '@/components/dashboard/ActivityCalendar';
import DashboardOnboardingTour from '@/components/onboarding/DashboardOnboardingTour';

export default function DashboardHome() {
    const { user, profile } = useAuth();
    const { stats, loading, calendarWeeks, todayStr, totalSubmissions } = useDashboardStats();

    // Dashboard tutorial force state for manual trigger
    const [forceShowTour, setForceShowTour] = useState(false);

    // User info
    const displayName = getDisplayName(profile?.name) || user?.email?.split('@')[0] || 'Member';
    const firstName = displayName.split(' ')[0];

    // Dynamic progress from current sheet
    const sheet = stats.currentSheet;
    const progress = loading ? 0 : (sheet?.solvedCount ?? 0);
    const total = sheet?.totalProblems ?? 0;
    const sheetLabel = sheet ? `Sheet ${sheet.letter}: ${sheet.name}` : 'No sheet started';
    const sheetHref = sheet ? `/dashboard/sheets/${sheet.levelSlug}/${sheet.slug}` : '/dashboard/sheets';

    return (
        <div className="w-full max-w-[100vw] animate-fade-in space-y-5 pb-4 md:pb-0">
            {/* Dashboard Onboarding Tour */}
            <DashboardOnboardingTour forceShow={forceShowTour} onComplete={() => setForceShowTour(false)} delay={1500} />

            {/* Phone home: a greeting, one card with where you stopped, one big button */}
            <div className="md:hidden space-y-4">
                <h1 className="text-2xl font-bold text-white leading-tight">
                    Hey {firstName}<span className="text-[#E8C15A]">.</span>
                </h1>
                <Link
                    href={sheetHref}
                    className="block rounded-2xl border border-white/10 bg-[#121214] p-4 active:bg-[#17171a]"
                >
                    <div className="flex items-center gap-4">
                        <ProgressRing progress={progress} total={total} size={220} compact />
                        <div className="min-w-0 flex-1">
                            <p className="text-sm text-white/60">{sheet ? 'Where you stopped' : 'Get started'}</p>
                            <p className="mt-0.5 text-base font-semibold text-white leading-snug line-clamp-2">{sheetLabel}</p>
                            {total > 0 && <p className="mt-1 text-sm text-white/60">{total - progress > 0 ? `${total - progress} left to solve` : 'Sheet complete'}</p>}
                        </div>
                    </div>
                    <div className="mt-4 flex h-12 items-center justify-center gap-2 rounded-xl bg-[#E8C15A] text-base font-bold text-black">
                        Continue Solving
                        <ArrowRight size={18} />
                    </div>
                </Link>
            </div>

            {/* Hero Section (tablet and desktop) */}
            <div className="hidden md:flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 lg:gap-16">
                <HeroSection
                    firstName={firstName}
                    sheetHref={sheetHref}
                />
                <ProgressRing
                    progress={progress}
                    total={total}
                    label={sheetLabel}
                    href={sheetHref}
                />
            </div>

            {/* Activity Calendar */}
            <ActivityCalendar
                weeks={calendarWeeks}
                totalSubmissions={totalSubmissions}
                todayStr={todayStr}
            />

            {/* Help */}
            <div className="flex flex-col gap-4">
                <div className="flex justify-center pb-4">
                    <button
                        onClick={() => setForceShowTour(true)}
                        className="text-xs text-white/30 hover:text-[#E8C15A] transition-colors flex items-center gap-1.5"
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
