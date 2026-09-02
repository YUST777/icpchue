'use client';

import React from 'react';
import Link from 'next/link';
import { 
    Phone, Send, ShieldAlert, CheckCircle2, 
    ArrowLeft, ExternalLink, MessageCircle
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
        cf_rating?: number;
        cf_rank?: string;
        cf_max_rating?: number;
        cf_max_rank?: string;
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
    const cleanPhone = (profile.phone || '').replace(/[^0-9+]/g, '');
    const waPhone = (profile.phone || '').replace(/[^0-9]/g, '');

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

    const getCodeforcesRankColor = (rank?: string, rating?: number) => {
        const r = (rank || '').toLowerCase();
        if (r.includes('grandmaster') || r.includes('legendary') || (rating && rating >= 2400)) return 'text-red-400 bg-red-500/10 border-red-500/25';
        if (r.includes('master') || (rating && rating >= 2200)) return 'text-orange-400 bg-orange-500/10 border-orange-500/25';
        if (r.includes('candidate') || (rating && rating >= 1900)) return 'text-purple-400 bg-purple-500/10 border-purple-500/25';
        if (r.includes('expert') || (rating && rating >= 1600)) return 'text-blue-400 bg-blue-500/10 border-blue-500/25';
        if (r.includes('specialist') || (rating && rating >= 1400)) return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/25';
        if (r.includes('pupil') || (rating && rating >= 1200)) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25';
        return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20';
    };

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
            {/* Top Row: Navigation Back Button, Identity Info, CF Rank, and Actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-1">
                <div className="flex items-start gap-3 min-w-0">
                    {/* Back to Trainees Directory */}
                    <Link
                        href="/dashboard/mentor"
                        className="mt-0.5 p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 text-white/50 hover:text-white border border-white/[0.08] transition-all shrink-0"
                        title="Return to Trainees Directory"
                    >
                        <ArrowLeft size={15} />
                    </Link>

                    <div className="min-w-0">
                        {/* Name & Primary Badges */}
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 dir="auto" className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
                                {profile.name}
                            </h1>
                            <span className="font-mono text-[11px] text-white/50 bg-white/[0.04] px-2 py-0.5 rounded-md border border-white/[0.06]">
                                {profile.student_id}
                            </span>
                            <span className="text-[10px] font-semibold text-[#E8C15A] bg-[#E8C15A]/10 px-2.5 py-0.5 rounded-full border border-[#E8C15A]/25">
                                {profile.academic_level}
                            </span>
                            {profile.cf_rating && profile.cf_rating > 0 ? (
                                <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md border capitalize ${getCodeforcesRankColor(profile.cf_rank, profile.cf_rating)}`}>
                                    {profile.cf_rank} {profile.cf_rating} {profile.cf_max_rating && profile.cf_max_rating > profile.cf_rating ? `(max: ${profile.cf_max_rating})` : ''}
                                </span>
                            ) : null}
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
                            <span dir="auto" className="truncate max-w-[160px] sm:max-w-[260px]">{profile.faculty}</span>
                            {profile.codeforces_handle && (
                                <a
                                    href={`https://codeforces.com/profile/${profile.codeforces_handle}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-white/75 hover:text-[#E8C15A] transition-colors font-medium font-mono"
                                >
                                    <SiCodeforces className="text-red-400" size={11} />
                                    <span>{profile.codeforces_handle}</span>
                                    <ExternalLink size={9} className="text-white/30" />
                                </a>
                            )}
                            {profile.phone && (
                                <div className="inline-flex items-center gap-1.5">
                                    <a
                                        href={`tel:${cleanPhone}`}
                                        className="inline-flex items-center gap-1 text-white/70 hover:text-white transition-colors"
                                    >
                                        <Phone size={10} className="text-[#E8C15A]" /> {profile.phone}
                                    </a>
                                    {waPhone && (
                                        <a
                                            href={`https://wa.me/${waPhone.startsWith('20') ? waPhone : `20${waPhone}`}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-0.5 text-[10px] text-emerald-400 hover:text-emerald-300 font-medium hover:underline"
                                            title="Message on WhatsApp"
                                        >
                                            <MessageCircle size={9} /> WhatsApp
                                        </a>
                                    )}
                                </div>
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
                </div>

                {/* Right: Last Solve Date */}
                <div className="shrink-0 self-end sm:self-center text-xs">
                    <div className="text-right text-[11px] text-white/40 font-mono">
                        <span>Last solve: <strong className="text-[#E8C15A] font-semibold">{formatDate(metrics.last_solve_at)}</strong></span>
                    </div>
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
