'use client';

import React, { useMemo } from 'react';
import { Activity } from 'lucide-react';

interface ActivityHeatmapProps {
    data: { date: string; count: number }[];
}

export function ActivityHeatmap90Days({ data }: ActivityHeatmapProps) {
    // Generate last 90 days grid (13 weeks x 7 days)
    const { calendarGrid, totalSolves, monthLabels } = useMemo(() => {
        const dataMap = new Map<string, number>();
        let sum = 0;
        data.forEach(d => {
            dataMap.set(d.date, d.count);
            sum += d.count;
        });

        const today = new Date();
        const days: { date: string; count: number; dayOfWeek: number; month: string }[] = [];
        const monthSet = new Set<string>();
        const labels: { name: string; colIndex: number }[] = [];

        // 91 days (13 full weeks)
        for (let i = 90; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const dateStr = d.toISOString().slice(0, 10);
            const count = dataMap.get(dateStr) || 0;
            const monthName = d.toLocaleDateString('en-US', { month: 'short' });

            days.push({
                date: dateStr,
                count,
                dayOfWeek: d.getDay(), // 0 = Sun, 1 = Mon ...
                month: monthName,
            });

            if (!monthSet.has(monthName)) {
                monthSet.add(monthName);
                labels.push({ name: monthName, colIndex: Math.floor((90 - i) / 7) });
            }
        }

        // Group into weeks (columns)
        const weeks: { date: string; count: number }[][] = [];
        let currentWeek: { date: string; count: number }[] = [];
        days.forEach((day, idx) => {
            currentWeek.push(day);
            if (currentWeek.length === 7 || idx === days.length - 1) {
                weeks.push(currentWeek);
                currentWeek = [];
            }
        });

        return { calendarGrid: weeks, totalSolves: sum, monthLabels: labels };
    }, [data]);

    const getIntensityClass = (count: number) => {
        if (count === 0) return 'bg-white/[0.04] border border-white/[0.03]';
        if (count <= 2) return 'bg-emerald-900/60 border border-emerald-700/50 text-emerald-200';
        if (count <= 5) return 'bg-emerald-600 border border-emerald-500 text-white';
        return 'bg-emerald-400 border border-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.5)]';
    };

    return (
        <div className="bg-[#121214] border border-white/[0.08] rounded-2xl p-5 shadow-xl backdrop-blur-md flex flex-col h-full">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                        <Activity size={16} />
                    </div>
                    <h2 className="text-base font-bold text-white tracking-tight">Activity Heatmap (Last 90 Days)</h2>
                </div>
                <span className="text-xs font-semibold text-emerald-400">{totalSolves} Solves recorded</span>
            </div>

            <div className="flex-1 flex flex-col justify-center">
                {/* Month header labels */}
                <div className="flex text-[10px] text-white/40 font-medium mb-1.5 pl-6 gap-6">
                    {monthLabels.map((m, i) => (
                        <span key={i}>{m.name}</span>
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    {/* Day labels (Mon, Wed, Fri) */}
                    <div className="flex flex-col justify-between text-[9px] text-white/30 h-28 pr-1 font-mono">
                        <span>Mon</span>
                        <span>Wed</span>
                        <span>Fri</span>
                        <span>Sun</span>
                    </div>

                    {/* 13-week grid */}
                    <div className="flex gap-1.5 overflow-x-auto scrollbar-hide py-1">
                        {calendarGrid.map((week, wIdx) => (
                            <div key={wIdx} className="flex flex-col gap-1.5">
                                {week.map((day) => (
                                    <div
                                        key={day.date}
                                        title={`${day.date}: ${day.count} problem${day.count === 1 ? '' : 's'} solved`}
                                        className={`w-3.5 h-3.5 rounded-sm transition-all duration-200 hover:scale-125 cursor-pointer ${getIntensityClass(day.count)}`}
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Heatmap Legend */}
                <div className="flex items-center justify-end gap-1.5 mt-4 text-[10px] text-white/40">
                    <span>Less</span>
                    <div className="w-2.5 h-2.5 rounded-sm bg-white/[0.04]" />
                    <div className="w-2.5 h-2.5 rounded-sm bg-emerald-900/60" />
                    <div className="w-2.5 h-2.5 rounded-sm bg-emerald-600" />
                    <div className="w-2.5 h-2.5 rounded-sm bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.5)]" />
                    <span>More</span>
                </div>
            </div>
        </div>
    );
}
