'use client';

import React, { useMemo } from 'react';
import { Activity } from 'lucide-react';

interface ActivityHeatmapProps {
    data: { date: string; count: number }[];
}

export function ActivityHeatmap90Days({ data }: ActivityHeatmapProps) {
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

        for (let i = 90; i >= 0; i--) {
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

            if (!monthSet.has(monthName)) {
                monthSet.add(monthName);
                labels.push({ name: monthName, colIndex: Math.floor((90 - i) / 7) });
            }
        }

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
        if (count === 0) return 'bg-white/[0.04] border border-white/[0.02]';
        if (count <= 2) return 'bg-emerald-900/60 border border-emerald-700/50';
        if (count <= 5) return 'bg-emerald-600 border border-emerald-500';
        return 'bg-emerald-400 border border-emerald-300 shadow-[0_0_6px_rgba(52,211,153,0.4)]';
    };

    return (
        <div className="bg-[#121214] border border-white/[0.08] rounded-xl p-3.5 shadow-md flex flex-col justify-between h-full">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/5">
                <div className="flex items-center gap-1.5">
                    <div className="p-1 rounded bg-emerald-500/10 text-emerald-400">
                        <Activity size={14} />
                    </div>
                    <h2 className="text-xs font-bold text-white tracking-tight uppercase">90-Day Activity Heatmap</h2>
                </div>
                <span className="text-[10px] font-semibold text-emerald-400">{totalSolves} Solves</span>
            </div>

            <div className="flex flex-col justify-center py-1">
                {/* Month labels */}
                <div className="flex text-[9px] text-white/40 font-medium mb-1 pl-4 gap-6">
                    {monthLabels.map((m, i) => (
                        <span key={i}>{m.name}</span>
                    ))}
                </div>

                <div className="flex items-center gap-1.5">
                    <div className="flex flex-col justify-between text-[8px] text-white/30 h-20 pr-0.5 font-mono">
                        <span>M</span>
                        <span>W</span>
                        <span>F</span>
                        <span>S</span>
                    </div>

                    <div className="flex gap-1 overflow-x-auto scrollbar-hide">
                        {calendarGrid.map((week, wIdx) => (
                            <div key={wIdx} className="flex flex-col gap-1">
                                {week.map((day) => (
                                    <div
                                        key={day.date}
                                        title={`${day.date}: ${day.count} solves`}
                                        className={`w-2.5 h-2.5 rounded-xs transition-transform hover:scale-125 cursor-pointer ${getIntensityClass(day.count)}`}
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-end gap-1 mt-2 text-[9px] text-white/40 border-t border-white/5 pt-1.5">
                <span>Less</span>
                <div className="w-2 h-2 rounded-xs bg-white/[0.04]" />
                <div className="w-2 h-2 rounded-xs bg-emerald-900/60" />
                <div className="w-2 h-2 rounded-xs bg-emerald-600" />
                <div className="w-2 h-2 rounded-xs bg-emerald-400" />
                <span>More</span>
            </div>
        </div>
    );
}
