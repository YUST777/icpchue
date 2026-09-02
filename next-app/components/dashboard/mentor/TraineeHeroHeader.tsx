'use client';

import React from 'react';
import Link from 'next/link';
import { 
    Phone, Mail, Send, ShieldAlert, 
    CheckCircle2, ArrowLeft, ExternalLink
} from 'lucide-react';
import { SiCodeforces } from 'react-icons/si';

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
        codeforces_handle?: string;
        created_at?: string;
        last_login_at?: string | null;
        cheating_flags?: number;
        is_shadow_banned?: boolean;
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
        <div className="bg-[#121214]/90 border border-white/[0.08] rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                {/* Identity info */}
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-base font-semibold text-white tracking-tight truncate">{profile.name}</h1>
                        <span className="font-mono text-[11px] text-white/50 bg-white/[0.04] px-2 py-0.5 rounded-md border border-white/[0.06]">
                            {profile.student_id}
                        </span>
                        <span className="text-[10px] font-semibold text-[#E8C15A] bg-[#E8C15A]/10 px-2.5 py-0.5 rounded-full border border-[#E8C15A]/25">
                            {profile.academic_level}
                        </span>
                        {isFlagged ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-400 bg-red-500/10 border border-red-500/25 px-2 py-0.5 rounded-full">
                                <ShieldAlert size={10} /> {profile.cheating_flags} Flags
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#E8C15A] bg-[#E8C15A]/10 px-2 py-0.5 rounded-full border border-[#E8C15A]/25">
                                <CheckCircle2 size={10} /> Clean
                            </span>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/45 mt-1.5">
                        <span className="truncate max-w-[220px]">{profile.faculty}</span>
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
                        {profile.telegram && (
                            <a 
                                href={`https://t.me/${profile.telegram.replace('@', '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                            >
                                <Send size={10} /> @{profile.telegram.replace('@', '')}
                            </a>
                        )}
                    </div>
                </div>

                {/* Right: Dates & Back */}
                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center text-xs">
                    <div className="text-right text-[11px] text-white/40">
                        <span>Last solve: <strong className="text-[#E8C15A] font-semibold">{formatDate(lastSolveAt)}</strong></span>
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
        </div>
    );
}
