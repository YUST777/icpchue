'use client';

import React from 'react';
import Link from 'next/link';
import { 
    Phone, Send, ShieldAlert, CheckCircle2, 
    ArrowLeft, ExternalLink
} from 'lucide-react';
import { SiCodeforces } from 'react-icons/si';

interface TraineeProfileCardProps {
    profile: {
        id: number;
        name: string;
        student_id: string;
        academic_level: string;
        faculty: string;
        phone?: string;
        email?: string;
        telegram?: string;
        codeforces_handle?: string;
        created_at?: string;
        last_login_at?: string | null;
        cheating_flags?: number;
        is_shadow_banned?: boolean;
    };
    metrics?: {
        problems_solved?: number;
        solved_percentage?: number;
        attempted?: number;
        attempted_percentage?: number;
        not_started?: number;
        not_started_percentage?: number;
        current_streak?: number;
        max_streak?: number;
        total_submissions?: number;
        submissions_last_7_days?: number;
        time_spent_str?: string;
        last_solve_at?: string | null;
    };
}

export function TraineeProfileCard({ profile, metrics = {} }: TraineeProfileCardProps) {
    const formatDate = (isoString?: string | null) => {
        if (!isoString) return 'Never';
        const d = new Date(isoString);
        if (isNaN(d.getTime())) return 'Never';
        return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    };

    const isFlagged = (profile.cheating_flags !== undefined && profile.cheating_flags > 0) || profile.is_shadow_banned;
    const sanitizedTg = (profile.telegram || '').replace(/^@+/, '').trim();

    const solved = metrics.problems_solved ?? 0;
    const solvedPct = metrics.solved_percentage ?? 0;
    const attempted = metrics.attempted ?? 0;
    const attemptedPct = metrics.attempted_percentage ?? 0;
    const notStarted = metrics.not_started ?? 0;
    const notStartedPct = metrics.not_started_percentage ?? 0;
    const currentStreak = metrics.current_streak ?? 0;
    const maxStreak = metrics.max_streak ?? 0;
    const totalSubs = metrics.total_submissions ?? 0;
    const last7d = metrics.submissions_last_7_days ?? 0;
    const timeSpent = metrics.time_spent_str || '0h 0m';

    const kpiMetrics = [
        {
            title: 'Problems Solved',
            value: solved.toString(),
            subtext: `${solvedPct}% of curriculum`,
            subtextColor: 'text-[#E8C15A]',
        },
        {
            title: 'Attempted',
            value: attempted.toString(),
            subtext: `${attemptedPct}% pending`,
            subtextColor: 'text-amber-400',
        },
        {
            title: 'Not Started',
            value: notStarted.toString(),
            subtext: `${notStartedPct}% remaining`,
            subtextColor: 'text-white/40',
        },
        {
            title: 'Current Streak',
            value: `${currentStreak}d`,
            subtext: `Best: ${maxStreak}d`,
            subtextColor: 'text-[#E8C15A]',
        },
        {
            title: 'Submissions',
            value: totalSubs.toString(),
            subtext: `7d: ${last7d}`,
            subtextColor: 'text-blue-400',
        },
        {
            title: 'Time Spent',
            value: timeSpent,
            subtext: 'This season',
            subtextColor: 'text-purple-400',
        },
    ];

    return (
        <div className="bg-[#121214]/90 border border-white/[0.08] rounded-2xl p-4 md:p-5 shadow-[0_4px_24px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl flex flex-col space-y-4">
            {/* Top Row: Identity Info & Navigation */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-1">
                <div className="min-w-0">
                    {/* Name & Primary Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
                            {profile.name}
                        </h1>
                        <span className="font-mono text-[11px] text-white/50 bg-white/[0.04] px-2 py-0.5 rounded-md border border-white/[0.06]">
                            {profile.student_id}
                        </span>
                        <span className="text-[10px] font-semibold text-[#E8C15A] bg-[#E8C15A]/10 px-2.5 py-0.5 rounded-full border border-[#E8C15A]/25">
                            {profile.academic_level}
                        </span>
                        {isFlagged ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-400 bg-red-500/10 border border-red-500/25 px-2 py-0.5 rounded-full">
                                <ShieldAlert size={10} /> {profile.cheating_flags ? `${profile.cheating_flags} Flags` : 'Shadow Banned'}
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#E8C15A] bg-[#E8C15A]/10 px-2 py-0.5 rounded-full border border-[#E8C15A]/25">
                                <CheckCircle2 size={10} /> Clean
                            </span>
                        )}
                    </div>

                    {/* Secondary Contact & Faculty Details */}
                    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs text-white/45 mt-1.5">
                        <span className="truncate max-w-[160px] sm:max-w-[260px]">{profile.faculty}</span>
                        {profile.codeforces_handle && (
                            <a
                                href={`https://codeforces.com/profile/${profile.codeforces_handle}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-white/75 hover:text-white transition-colors font-medium"
                            >
                                <SiCodeforces className="text-red-400" size={11} />
                                <span>{profile.codeforces_handle}</span>
                                <ExternalLink size={9} className="text-white/30" />
                            </a>
                        )}
                        {profile.phone && (
                            <span className="inline-flex items-center gap-1">
                                <Phone size={10} className="text-[#E8C15A]" /> {profile.phone}
                            </span>
                        )}
                        {sanitizedTg && (
                            <a 
                                href={`https://t.me/${sanitizedTg}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                            >
                                <Send size={10} /> @{sanitizedTg}
                            </a>
                        )}
                    </div>
                </div>

                {/* Right: Last Solve Date & Back Button */}
                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center text-xs">
                    <div className="text-right text-[11px] text-white/40 font-mono">
                        <span>Last solve: <strong className="text-[#E8C15A] font-semibold">{formatDate(metrics.last_solve_at)}</strong></span>
                    </div>
                    <Link
                        href="/dashboard/mentor"
                        className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-[0.98] text-white/80 hover:text-white text-xs font-medium transition-all border border-white/[0.08] flex items-center gap-1.5"
                    >
                        <ArrowLeft size={13} />
                        <span>All Trainees</span>
                    </Link>
                </div>
            </div>

            {/* Subtle Divider */}
            <div className="border-t border-white/[0.06]" />

            {/* Bottom Row: 6 KPI Metric Blocks (Clean Typographic Minimalist, No SVGs) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
                {kpiMetrics.map((card) => (
                    <div
                        key={card.title}
                        className="bg-black/30 border border-white/[0.04] hover:border-white/[0.1] rounded-xl p-3 flex flex-col justify-between transition-all group"
                    >
                        <span className="text-[10px] uppercase font-semibold tracking-wider text-white/40 truncate block mb-1">
                            {card.title}
                        </span>
                        <div>
                            <div className="text-lg sm:text-xl font-bold text-white tracking-tight">
                                {card.value}
                            </div>
                            <div className={`text-[10px] font-mono ${card.subtextColor} mt-0.5 truncate`}>
                                {card.subtext}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
