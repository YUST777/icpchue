'use client';

import Link from 'next/link';
import { Flame, Target, Trophy, Sparkles, TrendingUp } from 'lucide-react';

interface StatsFooterProps {
    streak: number;
    totalSolved: number;
    rank: string;
    loading: boolean;
    studentId?: string;
}

export function StatsFooter({ streak, totalSolved, rank, loading, studentId }: StatsFooterProps) {
    return (
        <div className="flex flex-col gap-4 mt-6 border-t border-white/5 pt-4">
            {/* Stats - Compact Grid */}
            <div className="grid grid-cols-2 gap-2 w-full">
                {/* Streak */}
                <div
                    className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg"
                    title={streak === 0 ? "Start your streak today!" : "Keep it going!"}
                >
                    <Flame size={14} className="text-orange-500 shrink-0" />
                    <div className="flex flex-col leading-none">
                        <span className="text-sm font-bold text-white">{loading ? '-' : streak}</span>
                        <span className="text-[9px] text-white/40 uppercase tracking-wider font-medium">Streak</span>
                    </div>
                </div>

                {/* Solved */}
                <div
                    className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg"
                    title="Total unique problems solved"
                >
                    <Target size={14} className="text-blue-500 shrink-0" />
                    <div className="flex flex-col leading-none">
                        <span className="text-sm font-bold text-white">{loading ? '-' : totalSolved}</span>
                        <span className="text-[9px] text-white/40 uppercase tracking-wider font-medium">Solved</span>
                    </div>
                </div>

                {/* Rank */}
                <div
                    className="col-span-2 flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg"
                    title="Codeforces rating"
                >
                    <Trophy size={14} className="text-[#E8C15A] shrink-0" />
                    <div className="flex flex-col leading-none">
                        <span className="text-sm font-bold text-white">{rank}</span>
                        <span className="text-[9px] text-white/40 uppercase tracking-wider font-medium">Rank</span>
                    </div>
                </div>
            </div>

            {/* Quick Links - Horizontal Scroll or Flex */}
            <div className="flex items-center justify-center gap-6 text-sm text-white/40 pt-2 pb-1">
                <Link
                    href={`/2025/${studentId || 'user'}`}
                    className="flex items-center gap-1.5 hover:text-[#E8C15A] transition-colors"
                >
                    <Sparkles size={14} /> 2025 Recap
                </Link>
                <Link
                    href="/2025/dec"
                    className="flex items-center gap-1.5 hover:text-white transition-colors"
                >
                    <TrendingUp size={14} /> Community
                </Link>
            </div>
        </div>
    );
}
