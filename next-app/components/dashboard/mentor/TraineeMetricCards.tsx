'use client';

import React from 'react';
import { motion } from 'framer-motion';
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
            subtext: `${metrics.solved_percentage}% of assigned`,
            subtextColor: 'text-emerald-400',
            icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
            borderHover: 'hover:border-emerald-500/40',
            badgeBg: 'bg-emerald-500/10',
        },
        {
            title: 'Attempted',
            value: metrics.attempted.toString(),
            subtext: `${metrics.attempted_percentage}% of assigned`,
            subtextColor: 'text-amber-400',
            icon: <Clock className="w-4 h-4 text-amber-400" />,
            borderHover: 'hover:border-amber-500/40',
            badgeBg: 'bg-amber-500/10',
        },
        {
            title: 'Not Started',
            value: metrics.not_started.toString(),
            subtext: `${metrics.not_started_percentage}% of assigned`,
            subtextColor: 'text-red-400',
            icon: <CircleDashed className="w-4 h-4 text-red-400" />,
            borderHover: 'hover:border-red-500/40',
            badgeBg: 'bg-red-500/10',
        },
        {
            title: 'Current Streak',
            value: `${metrics.current_streak} days`,
            subtext: `Best: ${metrics.max_streak} days`,
            subtextColor: 'text-[#E8C15A]',
            icon: <Flame className="w-4 h-4 text-[#E8C15A]" />,
            borderHover: 'hover:border-[#E8C15A]/40',
            badgeBg: 'bg-[#E8C15A]/10',
        },
        {
            title: 'Total Submissions',
            value: metrics.total_submissions.toString(),
            subtext: `Last 7 days: ${metrics.submissions_last_7_days}`,
            subtextColor: 'text-blue-400',
            icon: <Code2 className="w-4 h-4 text-blue-400" />,
            borderHover: 'hover:border-blue-500/40',
            badgeBg: 'bg-blue-500/10',
        },
        {
            title: 'Time Spent Solving',
            value: metrics.time_spent_str || '0h 0m',
            subtext: 'This season',
            subtextColor: 'text-purple-400',
            icon: <Timer className="w-4 h-4 text-purple-400" />,
            borderHover: 'hover:border-purple-500/40',
            badgeBg: 'bg-purple-500/10',
        },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {cards.map((card, i) => (
                <motion.div
                    key={card.title}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.3 }}
                    className={`bg-[#121214] border border-white/[0.08] ${card.borderHover} rounded-2xl p-4 flex flex-col justify-between transition-all group backdrop-blur-md hover:bg-white/[0.02]`}
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-white/40 truncate">
                            {card.title}
                        </span>
                        <div className={`p-1.5 rounded-lg ${card.badgeBg} group-hover:scale-110 transition-transform shrink-0`}>
                            {card.icon}
                        </div>
                    </div>
                    <div>
                        <div className="text-xl md:text-2xl font-black text-white tracking-tight">
                            {card.value}
                        </div>
                        <div className={`text-[11px] ${card.subtextColor} font-medium mt-0.5 truncate`}>
                            {card.subtext}
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}
