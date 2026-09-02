'use client';

import React, { useMemo } from 'react';
import { Flame, Sparkles } from 'lucide-react';

interface ActivityHeatmapProps {
    data: { date: string; count: number }[];
}

export function ActivityHeatmap90Days({ data }: ActivityHeatmapProps) {
    const { calendarGrid, totalSolves, monthLabels, maxStreak, activeDays } = useMemo(() => {
        const dataMap = new Map<string, number>();
        let sum = 0;
        let active = 0;
        data.forEach(d => {
            dataMap.set(d.date, d.count);
            sum += d.count;
            if (d.count > 0) active++;
        });

        // Generate 365 days / 52 full weeks for an expansive full-width grid
        const today = new Date();
        const days: { date: string; count: number; dayOfWeek: number; month: string }[] = [];
        const monthMap = new Map<string, number>();

        // 52 weeks = 364 days
        for (let i = 363; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const dateStr = d.toISOString().slice(0, 10);
            const count = dataMap.get(dateStr) || 0;
            const monthName = d.toLocaleDateString('en-US', { month: 'short' });

            days.push({
                date: dateStr,
                count,
                dayOfWeek: d.getDay(),
                month: monthName,
            });
        }

        const weeks: { date: string; count: number }[][] = [];
        let currentWeek: { date: string; count: number }[] = [];
        days.forEach((day, idx) => {
            currentWeek.push(day);
            if (currentWeek.length === 7 || idx === days.length - 1) {
                weeks.push(currentWeek);
                const firstDayMonth = currentWeek[0]?.date ? new Date(currentWeek[0].date).toLocaleDateString('en-US', { month: 'short' }) : '';
                if (firstDayMonth && !monthMap.has(firstDayMonth)) {
                    monthMap.set(firstDayMonth, weeks.length - 1);
                }
                currentWeek = [];
            }
        });

        const labels = Array.from(monthMap.entries()).map(([name, colIndex]) => ({ name, colIndex }));

        return { 
            calendarGrid: weeks, 
            totalSolves: sum, 
            monthLabels: labels,
            maxStreak: Math.max(...data.map(d => d.count), 0),
            activeDays: active
        };
    }, [data]);

    // Brand Gold / Yellow color intensities
    const getIntensityClass = (count: number) => {
        if (count === 0) return 'bg-white/[0.03] border border-white/[0.02]';
        if (count === 1) return 'bg-[#E8C15A]/25 border border-[#E8C15A]/35';
        if (count <= 3) return 'bg-[#E8C15A]/55 border border-[#E8C15A]/65';
        if (count <= 6) return 'bg-[#E8C15A]/85 border border-[#E8C15A]';
        return 'bg-[#FDE047] border border-[#FEF08A] shadow-[0_0_8px_rgba(232,193,90,0.7)]';
    };

    return (
        <div className="bg-[#121214] border border-white/[0.08] rounded-xl p-4 shadow-md flex flex-col w-full">
            {/* Header with KPI Metrics */}
            <div className="flex flex-wrap items-center justify-between pb-3 mb-3 border-b border-white/5 gap-2">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-[#E8C15A]/10 text-[#E8C15A]">
                        <Flame size={16} />
                    </div>
                    <div>
                        <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                            Activity Heatmap (Past Year)
                        </h2>
                        <span className="text-[10px] text-white/40">Daily solve frequency & practice consistency</span>
                    </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-semibold">
                    <div className="flex items-center gap-1.5">
                        <span className="text-white/40 text-[10px] uppercase">Solves:</span>
                        <span className="text-[#E8C15A] font-bold">{totalSolves}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="text-white/40 text-[10px] uppercase">Active Days:</span>
                        <span className="text-white font-bold">{activeDays}</span>
                    </div>
                </div>
            </div>

            {/* Expansive Full-Width Heatmap Grid */}
            <div className="w-full overflow-x-auto scrollbar-thin py-2">
                <div className="min-w-[720px]">
                    {/* Month labels along the top */}
                    <div className="flex text-[10px] text-white/40 font-medium mb-1 pl-6 justify-between pr-2">
                        {monthLabels.map((m, i) => (
                            <span key={i}>{m.name}</span>
                        ))}
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Day labels */}
                        <div className="flex flex-col justify-between text-[8px] text-white/30 h-24 pr-1 font-mono shrink-0">
                            <span>Mon</span>
                            <span>Wed</span>
                            <span>Fri</span>
                            <span>Sun</span>
                        </div>

                        {/* 52-week full-width grid */}
                        <div className="grid grid-flow-col auto-cols-fr gap-1 w-full">
                            {calendarGrid.map((week, wIdx) => (
                                <div key={wIdx} className="flex flex-col gap-1">
                                    {week.map((day) => (
                                        <div
                                            key={day.date}
                                            title={`${day.date}: ${day.count} solves`}
                                            className={`aspect-square w-full min-w-[10px] max-w-[14px] rounded-xs transition-transform hover:scale-125 cursor-pointer ${getIntensityClass(day.count)}`}
                                        />
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Legend */}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 text-[10px] text-white/40">
                <span className="flex items-center gap-1">
                    <Sparkles size={11} className="text-[#E8C15A]" /> Gold tiles represent active solve sessions
                </span>
                <div className="flex items-center gap-1.5">
                    <span>Less</span>
                    <div className="w-2.5 h-2.5 rounded-xs bg-white/[0.03] border border-white/5" />
                    <div className="w-2.5 h-2.5 rounded-xs bg-[#E8C15A]/25 border border-[#E8C15A]/35" />
                    <div className="w-2.5 h-2.5 rounded-xs bg-[#E8C15A]/55 border border-[#E8C15A]/65" />
                    <div className="w-2.5 h-2.5 rounded-xs bg-[#E8C15A]/85 border border-[#E8C15A]" />
                    <div className="w-2.5 h-2.5 rounded-xs bg-[#FDE047] shadow-[0_0_4px_rgba(232,193,90,0.8)]" />
                    <span>More</span>
                </div>
            </div>
        </div>
    );
}
