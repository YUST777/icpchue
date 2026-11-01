'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, Lock, X } from 'lucide-react';
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

    const entries: Entry[] = [
        ...Object.entries(ACHIEVEMENT_META).map(([id, meta]) => ({
            id,
            name: meta.name,
            imageSrc: meta.imageSrc,
            unlocked: id === 'welcome' || earnedIds.has(id),
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

    // Square tiles in as many rows as the card has room for.
    const boxRef = useRef<HTMLDivElement>(null);
    const [fit, setFit] = useState(PREVIEW);
    useLayoutEffect(() => {
        const el = boxRef.current;
        if (!el) return;
        const COLS = 6, GAP = 8;
        const calc = () => {
            const tile = (el.clientWidth - GAP * (COLS - 1)) / COLS;
            if (tile <= 0) return;
            setFit(Math.max(1, Math.floor((el.clientHeight + GAP) / (tile + GAP))) * COLS);
        };
        calc();
        const ro = new ResizeObserver(calc);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    useEffect(() => {
        if (!showAll) return;
        const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape') setShowAll(false); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [showAll]);

    const tile = (e: Entry, aspect: string) => (
        <li key={e.id} title={e.name}>
            <Link href="/dashboard/achievements"
                className={`relative block ${aspect} overflow-hidden rounded-xl border bg-white/[0.03] transition-colors ${e.unlocked ? 'border-white/[0.08] hover:border-[#E8C15A]/40' : 'border-white/[0.04]'}`}>
                <Image src={e.imageSrc} alt={e.name} fill sizes="80px" className={`object-contain p-1.5 ${e.unlocked ? '' : 'grayscale opacity-30'}`} />
                {!e.unlocked && <Lock className="absolute inset-0 m-auto h-3.5 w-3.5 text-white/60" />}
            </Link>
        </li>
    );

    return (
        <div className="flex h-full flex-col rounded-2xl border border-white/5 bg-[#121212] p-4">
            <div className="flex items-baseline justify-between gap-3">
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-semibold tracking-tight text-white">{count}</span>
                    <span className="text-sm text-gray-500">/ {total} unlocked</span>
                </div>
                <Link href="/dashboard/achievements" className="flex items-center gap-1 text-xs font-semibold text-[#E8C15A] transition-colors hover:text-[#dcb651]">
                    Open <ChevronRight size={12} />
                </Link>
            </div>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
                <div className="h-full bg-[#E8C15A]" style={{ width: `${progress}%` }} />
            </div>

            <div ref={boxRef} className="mt-3 min-h-[56px] flex-1 overflow-hidden">
                <ul className="grid grid-cols-6 gap-2">
                    {entries.slice(0, fit).map(e => tile(e, 'aspect-square'))}
                </ul>
            </div>

            {entries.length > fit && (
                <button type="button" onClick={() => setShowAll(true)}
                    className="mt-3 h-9 w-full cursor-pointer rounded-lg border border-white/5 bg-white/[0.03] text-xs font-medium text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white">
                    Show all {entries.length} badges
                </button>
            )}

            {showAll && createPortal(
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="All badges"
                    onClick={() => setShowAll(false)}>
                    <div className="max-h-[85dvh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/10 bg-[#121212] p-5" onClick={ev => ev.stopPropagation()}>
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-base font-medium text-white">All badges <span className="ml-2 font-mono text-xs text-white/50">{count} of {total}</span></h3>
                            <button type="button" onClick={() => setShowAll(false)} aria-label="Close" className="cursor-pointer rounded-lg p-1.5 text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white">
                                <X size={18} />
                            </button>
                        </div>
                        <ul className="grid grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-10">
                            {entries.map(e => tile(e, 'aspect-square'))}
                        </ul>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
