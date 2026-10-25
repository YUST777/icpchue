'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAchievements } from '@/hooks/useAchievements';
import { ACHIEVEMENT_META, isPodiumId } from '@/lib/achievements/catalog';

interface AchievementsWidgetProps {
    // Kept for the existing call site; the badge list now comes from the earned achievements.
    profile?: Record<string, unknown>;
    user?: { id?: number; email?: string; role?: string };
}

interface Entry { id: string; name: string; imageSrc: string; unlocked: boolean; weight: number }

const TIER_WEIGHT = { legendary: 3, rare: 2, common: 1 } as const;
const PREVIEW = 5;

const PODIUM = [
    { id: 'podium-1', name: 'Monthly 1st place' },
    { id: 'podium-2', name: 'Monthly 2nd place' },
    { id: 'podium-3', name: 'Monthly 3rd place' },
];

/** Every badge on one card: the ones you have in colour first, the rest dimmed. */
export default function AchievementsWidget(_props: AchievementsWidgetProps) {
    const { user } = useAuth();
    const { achievements: earned } = useAchievements(Boolean(user));
    const earnedIds = new Set(earned.map(a => a.achievement_id));
    const isStaff = user?.role === 'instructor' || user?.role === 'owner';

    const entries: Entry[] = [
        ...Object.entries(ACHIEVEMENT_META).map(([id, meta]) => ({
            id,
            name: meta.name,
            imageSrc: meta.imageSrc,
            unlocked: id === 'welcome' || earnedIds.has(id) || (id === 'instructor' && isStaff),
            weight: TIER_WEIGHT[meta.tier],
        })),
        ...PODIUM.map(p => ({
            id: p.id,
            name: p.name,
            imageSrc: `/images/achievements/badges/${p.id}.webp`,
            unlocked: earned.some(a => isPodiumId(a.achievement_id) && a.achievement_id.endsWith(p.id.slice(-2))),
            weight: p.id === 'podium-1' ? 3 : 2,
        })),
    ].sort((a, b) => Number(b.unlocked) - Number(a.unlocked) || b.weight - a.weight);

    const count = entries.filter(e => e.unlocked).length;
    const total = entries.length;
    const progress = (count / total) * 100;
    const [showAll, setShowAll] = useState(false);

    const rest = entries.slice(PREVIEW);

    const tile = (e: Entry, size: string) => (
        <li key={e.id} title={e.name} className={size}>
            <Link href="/dashboard/achievements"
                className={`relative block aspect-square rounded-xl border overflow-hidden transition-transform hover:scale-105 ${e.unlocked ? 'border-[#E8C15A]/25 bg-gradient-to-br from-yellow-500/15 to-orange-500/5' : 'border-white/5 bg-[#131313]'}`}>
                <Image src={e.imageSrc} alt={e.name} fill sizes="80px" className={`object-contain p-1.5 ${e.unlocked ? '' : 'grayscale opacity-30'}`} />
                {!e.unlocked && <Lock className="absolute inset-0 m-auto w-3.5 h-3.5 text-white/60" />}
            </Link>
        </li>
    );

    return (
        <div className="relative rounded-3xl p-[1px] bg-gradient-to-b from-white/10 to-transparent overflow-hidden">
            <div className="bg-[#0f0f0f] rounded-[23px] p-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                {/* One row on desktop: count and progress | the best badges | actions. Stacked on phones. */}
                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center gap-5 lg:gap-8">
                    <div className="lg:w-64 shrink-0">
                        <div className="flex items-baseline gap-2 mb-3">
                            <span className="text-3xl font-bold text-white tracking-tight">{count}</span>
                            <span className="text-gray-500 text-sm font-medium">/ {total} Unlocked</span>
                        </div>
                        <div className="relative w-full h-2.5 bg-[#1a1a1a] rounded-full overflow-hidden border border-white/5">
                            <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-300 shadow-[0_0_10px_rgba(250,204,21,0.5)]" style={{ width: `${progress}%` }} />
                        </div>
                    </div>

                    <ul className="grid grid-cols-5 lg:flex gap-2 lg:gap-3 lg:flex-1 lg:justify-center">
                        {entries.slice(0, PREVIEW).map(e => tile(e, 'lg:w-16'))}
                    </ul>

                    <div className="flex flex-col sm:flex-row lg:flex-col gap-2 lg:w-56 shrink-0">
                        {rest.length > 0 && (
                            <button type="button" onClick={() => setShowAll(v => !v)}
                                className="h-10 px-4 rounded-xl border border-white/5 bg-white/[0.03] text-xs font-medium text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer sm:flex-1 lg:flex-none">
                                {showAll ? 'Show less' : `Show all ${entries.length} badges`}
                            </button>
                        )}
                        <Link href="/dashboard/achievements" className="h-10 px-4 rounded-xl bg-[#161616] border border-white/5 hover:bg-[#1a1a1a] hover:border-white/10 transition-all group/btn flex items-center justify-between sm:flex-1 lg:flex-none">
                            <span className="text-xs font-bold text-white group-hover/btn:text-yellow-400 transition-colors">View All Badges</span>
                            <ChevronRight className="w-4 h-4 text-gray-400 group-hover/btn:text-yellow-500" />
                        </Link>
                    </div>
                </div>

                {showAll && (
                    <ul className="relative z-10 grid grid-cols-6 sm:grid-cols-10 lg:grid-cols-14 gap-2 mt-5 pt-5 border-t border-white/5">
                        {rest.map(e => tile(e, ''))}
                    </ul>
                )}
            </div>
        </div>
    );
}
