'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Award, Trophy } from 'lucide-react';
import PodiumRewards from '@/components/leaderboard/PodiumRewards';
import { fetchWithCache } from '@/lib/cache/api-cache';
import type { MonthlyPodium as Month, PodiumEntry } from '@/lib/leaderboard/monthly';

const MEDAL = {
    1: { height: 'h-16', block: 'bg-gradient-to-b from-[#F5D36B] to-[#B8892A] text-black', label: '1st' },
    2: { height: 'h-11', block: 'bg-gradient-to-b from-[#E4E7EC] to-[#8E96A3] text-black', label: '2nd' },
    3: { height: 'h-8', block: 'bg-gradient-to-b from-[#D99A6C] to-[#8A4F2A] text-black', label: '3rd' },
} as const;

function Place({ entry }: { entry: PodiumEntry | undefined; }) {
    if (!entry) return <div className="flex-1" />;
    const medal = MEDAL[entry.rank];
    const name = entry.studentId
        ? <Link href={`/dashboard/profile/${entry.studentId}`} className="hover:text-[#E8C15A] transition-colors">{entry.username}</Link>
        : entry.username;
    return (
        <div className="flex-1 min-w-0 flex flex-col items-center justify-end text-center">
            <div className="text-xs font-medium text-white truncate max-w-full px-1">{name}</div>
            <div className="text-[11px] text-white/40 tabular-nums mb-1.5">{entry.solved} solved</div>
            <div className={`${medal.height} w-full max-w-[110px] rounded-t-lg flex items-start justify-center pt-1.5 text-sm font-bold ${medal.block}`}>
                {entry.rank}
            </div>
        </div>
    );
}

/** The month's top three on one card, with a month switcher: one widget instead of a row per month. */
export default function MonthlyPodium() {
    const [months, setMonths] = useState<Month[]>([]);
    const [selected, setSelected] = useState<string | null>(null);
    const [rewardsOpen, setRewardsOpen] = useState(false);

    useEffect(() => {
        let cancelled = false;
        fetchWithCache<{ months?: Month[] }>('/api/leaderboard/monthly', { credentials: 'include' }, 300)
            .then(data => {
                if (cancelled || !Array.isArray(data.months)) return;
                setMonths(data.months);
                setSelected(data.months[0]?.month ?? null);
            })
            .catch(() => { /* the board works without the podium */ });
        return () => { cancelled = true; };
    }, []);

    const current = months.find(m => m.month === selected);
    if (!current) return null;
    const byRank = (rank: 1 | 2 | 3) => current.top.find(t => t.rank === rank);

    return (
        <div className="rounded-xl border border-white/5 bg-[#121212] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Trophy size={15} className="text-[#E8C15A]" /> Monthly top 3
                    {!current.complete && <span className="text-[11px] font-normal text-white/40">· so far</span>}
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto max-w-full">
                    {months.length > 1 && months.map(m => (
                        <button key={m.month} type="button" onClick={() => setSelected(m.month)}
                            className={`shrink-0 px-2.5 h-7 rounded-lg text-xs transition-colors cursor-pointer ${m.month === selected ? 'bg-white/[0.1] text-white font-medium' : 'text-white/50 hover:text-white hover:bg-white/[0.06]'}`}>
                            {m.label}
                        </button>
                    ))}
                    <button type="button" onClick={() => setRewardsOpen(true)}
                        className="shrink-0 inline-flex items-center gap-1.5 h-7 px-3 rounded-lg bg-[#E8C15A] text-black text-xs font-semibold hover:bg-[#d4ad45] transition-colors cursor-pointer">
                        <Award size={13} /> Win badges
                    </button>
                </div>
            </div>
            <div className="flex items-end gap-3 max-w-md mx-auto">
                <Place entry={byRank(2)} />
                <Place entry={byRank(1)} />
                <Place entry={byRank(3)} />
            </div>
            {rewardsOpen && <PodiumRewards onClose={() => setRewardsOpen(false)} />}
        </div>
    );
}
