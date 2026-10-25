'use client';

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

interface Entry { id: string; name: string; imageSrc: string; unlocked: boolean }

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
        })),
        ...PODIUM.map(p => ({
            id: p.id,
            name: p.name,
            imageSrc: `/images/achievements/badges/${p.id}.webp`,
            unlocked: earned.some(a => isPodiumId(a.achievement_id) && a.achievement_id.endsWith(p.id.slice(-2))),
        })),
    ].sort((a, b) => Number(b.unlocked) - Number(a.unlocked));

    const count = entries.filter(e => e.unlocked).length;
    const total = entries.length;
    const progress = (count / total) * 100;

    return (
        <div className="relative rounded-3xl p-[1px] bg-gradient-to-b from-white/10 to-transparent overflow-hidden">
            <div className="bg-[#0f0f0f] rounded-[23px] p-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                <div className="flex items-baseline gap-2 mb-4 relative z-10">
                    <span className="text-3xl font-bold text-white tracking-tight">{count}</span>
                    <span className="text-gray-500 text-sm font-medium">/ {total} Unlocked</span>
                </div>

                <div className="relative w-full h-2.5 bg-[#1a1a1a] rounded-full mb-5 overflow-hidden border border-white/5">
                    <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-300 shadow-[0_0_10px_rgba(250,204,21,0.5)]" style={{ width: `${progress}%` }} />
                </div>

                <ul className="grid grid-cols-5 sm:grid-cols-6 gap-2 mb-5 relative z-10">
                    {entries.map(e => (
                        <li key={e.id} title={e.name}>
                            <Link href="/dashboard/achievements"
                                className={`relative aspect-square rounded-xl border flex items-center justify-center overflow-hidden transition-transform hover:scale-105 ${e.unlocked ? 'border-[#E8C15A]/25 bg-gradient-to-br from-yellow-500/15 to-orange-500/5' : 'border-white/5 bg-[#131313]'}`}>
                                <Image src={e.imageSrc} alt={e.name} fill sizes="64px" className={`object-contain p-1.5 ${e.unlocked ? '' : 'grayscale opacity-30'}`} />
                                {!e.unlocked && <Lock className="absolute w-3.5 h-3.5 text-white/60" />}
                            </Link>
                        </li>
                    ))}
                </ul>

                <Link href="/dashboard/achievements" className="w-full relative overflow-hidden rounded-xl bg-[#161616] border border-white/5 hover:bg-[#1a1a1a] hover:border-white/10 transition-all group/btn block">
                    <div className="relative z-10 px-4 py-3 flex items-center justify-between">
                        <span className="text-sm font-bold text-white group-hover/btn:text-yellow-400 transition-colors">View All Badges</span>
                        <div className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center border border-white/5 group-hover/btn:border-yellow-500/30 group-hover/btn:bg-yellow-500/10 transition-all">
                            <ChevronRight className="w-4 h-4 text-gray-400 group-hover/btn:text-yellow-500" />
                        </div>
                    </div>
                </Link>
            </div>
        </div>
    );
}
