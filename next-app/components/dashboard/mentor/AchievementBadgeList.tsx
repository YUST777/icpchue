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
        subtext: 'Sheet 1 AC',
        icon: <Trophy size={14} className="text-[#E8C15A]" />,
        color: 'border-[#E8C15A]/40 text-[#E8C15A]',
        bg: 'bg-[#E8C15A]/10',
    },
    'consistent-coder': {
        label: '7d Streak',
        subtext: 'Consistent',
        icon: <Flame size={14} className="text-emerald-400" />,
        color: 'border-emerald-500/40 text-emerald-400',
        bg: 'bg-emerald-500/10',
    },
    'fast-solver': {
        label: 'Fast AC',
        subtext: '< 10m solve',
        icon: <Zap size={14} className="text-purple-400" />,
        color: 'border-purple-500/40 text-purple-400',
        bg: 'bg-purple-500/10',
    },
    'streak-5': {
        label: '5d Streak',
        subtext: 'Active',
        icon: <Award size={14} className="text-amber-400" />,
        color: 'border-amber-500/40 text-amber-400',
        bg: 'bg-amber-500/10',
    },
    'problem-cracker': {
        label: '50+ Solves',
        subtext: 'Veteran',
        icon: <Target size={14} className="text-blue-400" />,
        color: 'border-blue-500/40 text-blue-400',
        bg: 'bg-blue-500/10',
    },
};

export function AchievementBadgeList({ achievements }: AchievementBadgeListProps) {
    const unlockedIds = new Set(achievements.map(a => a.achievement_id.toLowerCase()));
    const badgeKeys = Object.keys(BADGE_MAP);

    return (
        <div className="bg-[#121214] border border-white/[0.08] rounded-xl p-3.5 shadow-md flex flex-col h-full">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/5">
                <div className="flex items-center gap-1.5">
                    <div className="p-1 rounded bg-purple-500/10 text-purple-400">
                        <Trophy size={14} />
                    </div>
                    <h2 className="text-xs font-bold text-white tracking-tight uppercase">Achievements</h2>
                </div>
                <span className="text-[10px] text-white/40 font-medium">{achievements.length} Unlocked</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 flex-1">
                {badgeKeys.map((key) => {
                    const badge = BADGE_MAP[key];
                    const isUnlocked = unlockedIds.has(key) || achievements.length > 1;

                    return (
                        <div
                            key={key}
                            className={`rounded-lg p-2 border flex flex-col items-center text-center transition-all ${
                                isUnlocked
                                    ? `${badge.bg} ${badge.color} border-current shadow-xs`
                                    : 'bg-white/[0.02] border-white/5 text-white/20'
                            }`}
                        >
                            <div className="p-1.5 rounded-lg bg-black/40 mb-1">
                                {isUnlocked ? badge.icon : <Lock size={12} className="text-white/20" />}
                            </div>
                            <span className="text-[10px] font-bold text-white tracking-tight block truncate w-full">
                                {badge.label}
                            </span>
                            <span className="text-[8px] text-white/50 block mt-0.5 truncate w-full">
                                {isUnlocked ? badge.subtext : 'Locked'}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
