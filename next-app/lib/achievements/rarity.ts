import type { HolderStats } from '@/lib/achievements/holder-stats';

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export const RARITY_TEXT: Record<Rarity, string> = { common: 'text-white/50', rare: 'text-sky-400', epic: 'text-purple-400', legendary: 'text-[#E8C15A]' };

/** Rarity from the share of members who hold the badge. */
export function rarityFromShare(pct: number): Rarity {
    if (pct >= 30) return 'common';
    if (pct >= 10) return 'rare';
    if (pct >= 3) return 'epic';
    return 'legendary';
}

/** Share of members holding a badge, or null until the numbers are loaded. */
export function holderShare(stats: HolderStats | null, id: string): number | null {
    if (!stats || stats.total <= 0) return null;
    return ((stats.counts[id] ?? 0) / stats.total) * 100;
}

export function shareLabel(pct: number): string {
    return pct === 0 ? '0%' : pct < 0.1 ? '<0.1%' : `${pct < 10 ? pct.toFixed(1) : Math.round(pct)}%`;
}
