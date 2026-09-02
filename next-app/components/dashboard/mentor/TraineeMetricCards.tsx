'use client';

import React from 'react';
import { 
    CheckCircle2, Clock, CircleDashed, Flame, 
    Code2, Timer
} from 'lucide-react';

interface MetricCardsProps {
    metrics: {
        problems_solved: number;
        solved_percentage: number;
        attempted: number;
        attempted_percentage: number;
        not_started: number;
        not_started_percentage: number;
        current_streak: number;
        max_streak: number;
        total_submissions: number;
        submissions_last_7_days: number;
        time_spent_str: string;
    };
}

export function TraineeMetricCards({ metrics }: MetricCardsProps) {
    const cards = [
        {
            title: 'Problems Solved',
            value: metrics.problems_solved.toString(),
            subtext: `${metrics.solved_percentage}% assigned`,
            subtextColor: 'text-emerald-400',
            icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
            borderHover: 'hover:border-emerald-500/40',
            badgeBg: 'bg-emerald-500/10',
        },
        {
            title: 'Attempted',
            value: metrics.attempted.toString(),
            subtext: `${metrics.attempted_percentage}% pending`,
            subtextColor: 'text-amber-400',
            icon: <Clock className="w-3.5 h-3.5 text-amber-400" />,
            borderHover: 'hover:border-amber-500/40',
            badgeBg: 'bg-amber-500/10',
        },
        {
            title: 'Not Started',
            value: metrics.not_started.toString(),
            subtext: `${metrics.not_started_percentage}% left`,
            subtextColor: 'text-red-400',
            icon: <CircleDashed className="w-3.5 h-3.5 text-red-400" />,
            borderHover: 'hover:border-red-500/40',
            badgeBg: 'bg-red-500/10',
        },
        {
            title: 'Current Streak',
            value: `${metrics.current_streak}d`,
            subtext: `Best: ${metrics.max_streak}d`,
            subtextColor: 'text-[#E8C15A]',
            icon: <Flame className="w-3.5 h-3.5 text-[#E8C15A]" />,
            borderHover: 'hover:border-[#E8C15A]/40',
            badgeBg: 'bg-[#E8C15A]/10',
        },
        {
            title: 'Submissions',
            value: metrics.total_submissions.toString(),
            subtext: `7d: ${metrics.submissions_last_7_days}`,
            subtextColor: 'text-blue-400',
            icon: <Code2 className="w-3.5 h-3.5 text-blue-400" />,
            borderHover: 'hover:border-blue-500/40',
            badgeBg: 'bg-blue-500/10',
        },
        {
            title: 'Time Spent',
            value: metrics.time_spent_str || '0h 0m',
            subtext: 'This season',
            subtextColor: 'text-purple-400',
            icon: <Timer className="w-3.5 h-3.5 text-purple-400" />,
            borderHover: 'hover:border-purple-500/40',
            badgeBg: 'bg-purple-500/10',
        },
    ];

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {cards.map((card) => (
                <div
                    key={card.title}
                    className={`bg-[#121214] border border-white/[0.08] ${card.borderHover} rounded-xl p-3 flex flex-col justify-between transition-all group backdrop-blur-md`}
                >
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] uppercase font-bold tracking-wider text-white/40 truncate">
                            {card.title}
                        </span>
                        <div className={`p-1 rounded ${card.badgeBg} shrink-0`}>
                            {card.icon}
                        </div>
                    </div>
                    <div>
                        <div className="text-lg font-black text-white tracking-tight">
                            {card.value}
                        </div>
                        <div className={`text-[10px] ${card.subtextColor} font-medium truncate`}>
                            {card.subtext}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
