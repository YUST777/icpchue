'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
    Phone, Mail, Send, Laptop, ShieldAlert, 
    CheckCircle2, ArrowLeft, ExternalLink
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
        return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    };

    const isFlagged = (profile.cheating_flags && profile.cheating_flags > 0) || profile.is_shadow_banned;

    return (
        <div className="bg-[#121214] border border-white/[0.08] rounded-xl p-3.5 shadow-lg backdrop-blur-md">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                {/* Left: Avatar + Identity + Tags */}
                <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#E8C15A]/20 to-white/5 border border-white/10 overflow-hidden flex items-center justify-center text-base font-black text-[#E8C15A]">
                            {profile.profile_picture ? (
                                <Image
                                    src={profile.profile_picture.startsWith('http') || profile.profile_picture.startsWith('/')
                                        ? profile.profile_picture
                                        : `/pfps/${profile.profile_picture}`}
                                    alt={profile.name}
                                    width={48}
                                    height={48}
                                    className="w-full h-full object-cover"
                                    unoptimized
                                />
                            ) : (
                                profile.name.slice(0, 2).toUpperCase()
                            )}
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#121214]" />
                    </div>

                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-base md:text-lg font-bold text-white truncate">{profile.name}</h1>
                            <span className="font-mono text-[11px] text-white/60 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                                {profile.student_id}
                            </span>
                            <span className="text-[10px] font-semibold text-[#E8C15A] bg-[#E8C15A]/10 px-2 py-0.5 rounded-full border border-[#E8C15A]/20">
                                {profile.academic_level}
                            </span>
                            {isFlagged ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded">
                                    <ShieldAlert size={10} /> {profile.cheating_flags || 1} Flags
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                    <CheckCircle2 size={10} /> Clean
                                </span>
                            )}
                        </div>

                        {/* Quick Metadata & Links */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-white/50 mt-1">
                            <span className="truncate max-w-[180px]">{profile.faculty}</span>
                            {profile.codeforces_handle && (
                                <a
                                    href={`https://codeforces.com/profile/${profile.codeforces_handle}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-white/80 hover:text-white font-semibold"
                                >
                                    <SiCodeforces className="text-red-400" size={10} />
                                    <span>{profile.codeforces_handle}</span>
                                    <ExternalLink size={9} className="text-white/30" />
                                </a>
                            )}
                            {profile.phone && (
                                <span className="inline-flex items-center gap-1">
                                    <Phone size={10} className="text-[#E8C15A]" /> {profile.phone}
                                </span>
                            )}
                            {profile.telegram && (
                                <a 
                                    href={`https://t.me/${profile.telegram.replace('@', '')}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300"
                                >
                                    <Send size={10} /> @{profile.telegram.replace('@', '')}
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right: Quick Action Back & Dates */}
                <div className="flex items-center gap-3 shrink-0 self-end md:self-center text-xs">
                    <div className="text-right hidden sm:block text-[11px] text-white/40">
                        <span>Last solve: <strong className="text-emerald-400 font-semibold">{formatDate(lastSolveAt)}</strong></span>
                    </div>
                    <Link
                        href="/dashboard/mentor"
                        className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-semibold transition-all border border-white/10 flex items-center gap-1"
                    >
                        <ArrowLeft size={13} />
                        <span>All Trainees</span>
                    </Link>
                </div>
            </div>
        </div>
    );
}
