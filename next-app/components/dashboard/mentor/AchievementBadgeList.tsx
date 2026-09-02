'use client';

import React from 'react';
import { Trophy, Flame, Zap, Award, Target, Lock } from 'lucide-react';

interface AchievementItem {
    id: number;
    achievement_id: string;
    earned_at: string;
}

interface AchievementBadgeListProps {
    achievements: AchievementItem[];
}

const BADGE_MAP: Record<string, { label: string; subtext: string; icon: React.ReactNode; color: string; bg: string }> = {
    'sheet-1': {
        label: 'Sheet Master',
        subtext: 'Completed Sheet 1',
        icon: <Trophy size={18} className="text-[#E8C15A]" />,
        color: 'border-[#E8C15A]/40 text-[#E8C15A]',
        bg: 'bg-[#E8C15A]/10',
    },
    'consistent-coder': {
        label: 'Consistent Coder',
        subtext: '7 Days Streak',
        icon: <Flame size={18} className="text-emerald-400" />,
        color: 'border-emerald-500/40 text-emerald-400',
        bg: 'bg-emerald-500/10',
    },
    'fast-solver': {
        label: 'Fast Solver',
        subtext: '< 10 mins AC',
        icon: <Zap size={18} className="text-purple-400" />,
        color: 'border-purple-500/40 text-purple-400',
        bg: 'bg-purple-500/10',
    },
    'streak-5': {
        label: '5 Day Streak',
        subtext: 'Active Practice',
        icon: <Award size={18} className="text-amber-400" />,
        color: 'border-amber-500/40 text-amber-400',
        bg: 'bg-amber-500/10',
    },
    'problem-cracker': {
        label: 'Problem Cracker',
        subtext: '50+ Problems Solved',
        icon: <Target size={18} className="text-blue-400" />,
        color: 'border-blue-500/40 text-blue-400',
        bg: 'bg-blue-500/10',
    },
};

export function AchievementBadgeList({ achievements }: AchievementBadgeListProps) {
    const unlockedIds = new Set(achievements.map(a => a.achievement_id.toLowerCase()));

    const badgeKeys = Object.keys(BADGE_MAP);

    return (
        <div className="bg-[#121214] border border-white/[0.08] rounded-2xl p-5 shadow-xl backdrop-blur-md flex flex-col h-full">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
                        <Trophy size={16} />
                    </div>
                    <h2 className="text-base font-bold text-white tracking-tight">Unlocked Achievements</h2>
                </div>
                <span className="text-xs text-white/40 font-medium">{achievements.length} Unlocked</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 flex-1">
                {badgeKeys.map((key) => {
                    const badge = BADGE_MAP[key];
                    const isUnlocked = unlockedIds.has(key) || achievements.length > 2; // sample fallback

                    return (
                        <div
                            key={key}
                            className={`rounded-xl p-3 border flex flex-col items-center text-center transition-all ${
                                isUnlocked
                                    ? `${badge.bg} ${badge.color} border-current hover:scale-105 shadow-md`
                                    : 'bg-white/[0.02] border-white/5 text-white/20'
                            }`}
                        >
                            <div className="p-2.5 rounded-xl bg-black/40 mb-2">
                                {isUnlocked ? badge.icon : <Lock size={16} className="text-white/20" />}
                            </div>
                            <span className="text-xs font-bold text-white tracking-tight block">
                                {badge.label}
                            </span>
                            <span className="text-[10px] text-white/50 block mt-0.5">
                                {isUnlocked ? badge.subtext : 'Locked'}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
