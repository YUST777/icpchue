'use client';

import React from 'react';
import { 
    CheckCircle2, Clock, CircleDashed, Flame, 
    Code2, Timer
} from 'lucide-react';

interface MetricCardsProps {
    metrics?: {
        problems_solved?: number;
        solved_percentage?: number;
        attempted?: number;
        attempted_percentage?: number;
        not_started?: number;
        not_started_percentage?: number;
        current_streak?: number;
        max_streak?: number;
        total_submissions?: number;
        submissions_last_7_days?: number;
        time_spent_str?: string;
    };
}

export function TraineeMetricCards({ metrics = {} }: MetricCardsProps) {
    const solved = metrics.problems_solved ?? 0;
    const solvedPct = metrics.solved_percentage ?? 0;
    const attempted = metrics.attempted ?? 0;
    const attemptedPct = metrics.attempted_percentage ?? 0;
    const notStarted = metrics.not_started ?? 0;
    const notStartedPct = metrics.not_started_percentage ?? 0;
    const currentStreak = metrics.current_streak ?? 0;
    const maxStreak = metrics.max_streak ?? 0;
    const totalSubs = metrics.total_submissions ?? 0;
    const last7d = metrics.submissions_last_7_days ?? 0;

    const cards = [
        {
            title: 'Problems Solved',
            value: solved.toString(),
            subtext: `${solvedPct}% of curriculum`,
            subtextColor: 'text-[#E8C15A]',
            icon: <CheckCircle2 className="w-3.5 h-3.5 text-[#E8C15A]" />,
            badgeBg: 'bg-[#E8C15A]/10',
        },
        {
            title: 'Attempted',
            value: attempted.toString(),
            subtext: `${attemptedPct}% pending`,
            subtextColor: 'text-amber-400',
            icon: <Clock className="w-3.5 h-3.5 text-amber-400" />,
            badgeBg: 'bg-amber-500/10',
        },
        {
            title: 'Not Started',
            value: notStarted.toString(),
            subtext: `${notStartedPct}% remaining`,
            subtextColor: 'text-white/40',
            icon: <CircleDashed className="w-3.5 h-3.5 text-white/40" />,
            badgeBg: 'bg-white/5',
        },
        {
            title: 'Current Streak',
            value: `${currentStreak}d`,
            subtext: `Best: ${maxStreak}d`,
            subtextColor: 'text-[#E8C15A]',
            icon: <Flame className="w-3.5 h-3.5 text-[#E8C15A]" />,
            badgeBg: 'bg-[#E8C15A]/10',
        },
        {
            title: 'Submissions',
            value: totalSubs.toString(),
            subtext: `7d: ${last7d}`,
            subtextColor: 'text-blue-400',
            icon: <Code2 className="w-3.5 h-3.5 text-blue-400" />,
            badgeBg: 'bg-blue-500/10',
        },
        {
            title: 'Time Spent',
            value: metrics.time_spent_str || '0h 0m',
            subtext: 'This season',
            subtextColor: 'text-purple-400',
            icon: <Timer className="w-3.5 h-3.5 text-purple-400" />,
            badgeBg: 'bg-purple-500/10',
        },
    ];

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {cards.map((card) => (
                <div
                    key={card.title}
                    className="bg-[#121214]/90 border border-white/[0.08] hover:border-white/[0.14] rounded-2xl p-3.5 flex flex-col justify-between transition-all backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.06)] group"
                >
                    <div className="flex items-center justify-between mb-1.5 min-w-0">
                        <span className="text-[10px] uppercase font-semibold tracking-wider text-white/40 truncate pr-1">
                            {card.title}
                        </span>
                        <div className={`p-1.5 rounded-lg ${card.badgeBg} shrink-0`}>
                            {card.icon}
                        </div>
                    </div>
                    <div>
                        <div className="text-xl font-semibold text-white tracking-tight">
                            {card.value}
                        </div>
                        <div className={`text-[11px] font-mono ${card.subtextColor} mt-0.5 truncate`}>
                            {card.subtext}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
