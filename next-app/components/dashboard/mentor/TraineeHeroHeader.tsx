'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
    Phone, Mail, Send, Laptop, ShieldAlert, 
    CheckCircle2, ArrowLeft, ExternalLink, UserCheck
} from 'lucide-react';
import { SiCodeforces, SiLeetcode } from 'react-icons/si';

interface TraineeHeroHeaderProps {
    profile: {
        id: number;
        name: string;
        student_id: string;
        academic_level: string;
        faculty: string;
        phone?: string;
        email?: string;
        telegram?: string;
        has_laptop?: boolean;
        codeforces_handle?: string;
        leetcode_profile?: string;
        profile_picture?: string | null;
        created_at?: string;
        last_login_at?: string | null;
        cheating_flags?: number;
        is_shadow_banned?: boolean;
        season_year?: number;
        cohort_group?: string;
    };
    lastSolveAt?: string | null;
}

export function TraineeHeroHeader({ profile, lastSolveAt }: TraineeHeroHeaderProps) {
    const formatDate = (isoString?: string | null) => {
        if (!isoString) return 'Never';
        const d = new Date(isoString);
        return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const formatTimeAgo = (isoString?: string | null) => {
        if (!isoString) return 'Never';
        const d = new Date(isoString);
        const diffMs = Date.now() - d.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        if (diffHours < 1) return 'Just now';
        if (diffHours < 24) return `Today, ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
        if (diffHours < 48) return `Yesterday, ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
        return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    };

    const isFlagged = (profile.cheating_flags && profile.cheating_flags > 0) || profile.is_shadow_banned;

    return (
        <div className="bg-[#121214] border border-white/[0.08] rounded-2xl p-5 md:p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
            {/* Top Back & Action Breadcrumb */}
            <div className="flex items-center justify-between pb-5 mb-5 border-b border-white/5">
                <div className="flex items-center gap-2 text-xs md:text-sm text-white/50">
                    <Link href="/dashboard/mentor" className="hover:text-[#E8C15A] transition-colors flex items-center gap-1">
                        <ArrowLeft size={14} /> Trainees
                    </Link>
                    <span>/</span>
                    <span className="text-white font-semibold truncate max-w-[200px]">{profile.name}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Link
                        href="/dashboard/mentor"
                        className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-semibold transition-all border border-white/10 flex items-center gap-1.5"
                    >
                        <ArrowLeft size={14} />
                        Back to Trainees
                    </Link>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                {/* Left: Avatar & Personal Info */}
                <div className="flex items-start gap-4 md:gap-5">
                    <div className="relative shrink-0">
                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-[#E8C15A]/20 to-white/5 border border-white/10 overflow-hidden flex items-center justify-center text-xl md:text-2xl font-black text-[#E8C15A] shadow-inner">
                            {profile.profile_picture ? (
                                <Image
                                    src={profile.profile_picture.startsWith('http') || profile.profile_picture.startsWith('/')
                                        ? profile.profile_picture
                                        : `/pfps/${profile.profile_picture}`}
                                    alt={profile.name}
                                    width={80}
                                    height={80}
                                    className="w-full h-full object-cover"
                                    unoptimized
                                />
                            ) : (
                                profile.name.slice(0, 2).toUpperCase()
                            )}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#121214]" title="Active Trainee" />
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-lg md:text-2xl font-bold text-white tracking-tight">{profile.name}</h1>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Active
                            </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/50">
                            <span className="font-mono text-white/70 font-semibold">{profile.student_id}</span>
                            <span>•</span>
                            <span className="text-[#E8C15A] font-medium">{profile.academic_level}</span>
                        </div>

                        {/* Contact Channels */}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-white/60 pt-1">
                            {profile.phone && (
                                <span className="inline-flex items-center gap-1 hover:text-white transition-colors">
                                    <Phone size={12} className="text-[#E8C15A]" /> {profile.phone}
                                </span>
                            )}
                            {profile.email && (
                                <span className="inline-flex items-center gap-1 hover:text-white transition-colors">
                                    <Mail size={12} className="text-[#E8C15A]" /> {profile.email}
                                </span>
                            )}
                            {profile.telegram && (
                                <a 
                                    href={`https://t.me/${profile.telegram.replace('@', '')}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                    <Send size={12} /> @{profile.telegram.replace('@', '')}
                                </a>
                            )}
                        </div>

                        {/* External Handles & Faculty Tags */}
                        <div className="flex flex-wrap items-center gap-2 pt-2">
                            {profile.codeforces_handle && (
                                <a
                                    href={`https://codeforces.com/profile/${profile.codeforces_handle}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-semibold border border-white/10 transition-all"
                                >
                                    <SiCodeforces className="text-red-400" size={12} />
                                    <span>{profile.codeforces_handle}</span>
                                    <ExternalLink size={10} className="text-white/40" />
                                </a>
                            )}
                            {profile.leetcode_profile && (
                                <a
                                    href={`https://leetcode.com/u/${profile.leetcode_profile}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-semibold border border-white/10 transition-all"
                                >
                                    <SiLeetcode className="text-amber-400" size={12} />
                                    <span>{profile.leetcode_profile}</span>
                                    <ExternalLink size={10} className="text-white/40" />
                                </a>
                            )}
                            <span className="px-2.5 py-1 rounded-lg bg-white/5 text-white/70 text-xs font-medium border border-white/5">
                                {profile.faculty}
                            </span>
                            {profile.has_laptop && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 text-xs font-medium border border-emerald-500/20">
                                    <Laptop size={12} /> Has Laptop
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right: Meta Information Columns */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 md:gap-6 text-xs border-t lg:border-t-0 lg:border-l border-white/10 pt-4 lg:pt-0 lg:pl-6 w-full lg:w-auto">
                    <div className="space-y-1">
                        <span className="text-white/40 block text-[11px] uppercase tracking-wider font-bold">Joined Season</span>
                        <span className="text-white font-semibold">{profile.season_year || 2026} Season</span>
                        <span className="text-white/40 block text-[10px] pt-1">Registered At</span>
                        <span className="text-white/70 font-medium">{formatDate(profile.created_at)}</span>
                    </div>

                    <div className="space-y-1">
                        <span className="text-white/40 block text-[11px] uppercase tracking-wider font-bold">Last Login</span>
                        <span className="text-white font-semibold">{formatTimeAgo(profile.last_login_at)}</span>
                        <span className="text-white/40 block text-[10px] pt-1">Last Solve</span>
                        <span className="text-emerald-400 font-semibold">{formatTimeAgo(lastSolveAt)}</span>
                    </div>

                    <div className="space-y-1 col-span-2 sm:col-span-1">
                        <span className="text-white/40 block text-[11px] uppercase tracking-wider font-bold">Integrity Status</span>
                        {isFlagged ? (
                            <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 text-red-400 font-bold bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded text-[11px]">
                                    <ShieldAlert size={12} /> {profile.cheating_flags || 1} Flags
                                </span>
                                {profile.is_shadow_banned && (
                                    <span className="block text-purple-400 text-[10px] font-bold">Shadow Banned</span>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                                    <CheckCircle2 size={12} /> No Flags
                                </span>
                                <span className="block text-white/50 text-[10px]">Clean History</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
