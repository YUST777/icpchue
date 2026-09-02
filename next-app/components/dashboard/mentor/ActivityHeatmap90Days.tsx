'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Flame } from 'lucide-react';

interface ActivityHeatmapProps {
    data: { date: string; count: number }[];
}

interface HoveredDayInfo {
    date: string;
    count: number;
    x: number;
    y: number;
}

export function ActivityHeatmap90Days({ data }: ActivityHeatmapProps) {
    const [hoveredDay, setHoveredDay] = useState<HoveredDayInfo | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const { calendarGrid, totalSolves, monthLabels, activeDays } = useMemo(() => {
        const dataMap = new Map<string, number>();
        let sum = 0;
        let active = 0;
        (data || []).forEach(d => {
            dataMap.set(d.date, d.count);
            sum += d.count;
            if (d.count > 0) active++;
        });

        // 52 full weeks for an expansive full-width grid
        const today = new Date();
        const days: { date: string; count: number; dayOfWeek: number; month: string }[] = [];
        const monthMap = new Map<string, number>();

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
            activeDays: active
        };
    }, [data]);

    const getIntensityClass = (count: number) => {
        if (count === 0) return 'bg-white/[0.03] border border-white/[0.02]';
        if (count === 1) return 'bg-[#E8C15A]/25 border border-[#E8C15A]/35';
        if (count <= 3) return 'bg-[#E8C15A]/55 border border-[#E8C15A]/65';
        if (count <= 6) return 'bg-[#E8C15A]/85 border border-[#E8C15A]';
        return 'bg-[#FDE047] border border-[#FEF08A] shadow-[0_0_8px_rgba(232,193,90,0.7)]';
    };

    const formatTooltipDate = (dateStr?: string) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    };

    const tooltipElement = (hoveredDay && mounted) ? createPortal(
        <div
            style={{
                position: 'fixed',
                left: `${hoveredDay.x}px`,
                top: `${hoveredDay.y - 12}px`,
                transform: 'translate(-50%, -100%)',
                pointerEvents: 'none',
                zIndex: 999999,
            }}
            className="bg-[#18181B] border border-white/20 rounded-xl px-3 py-1.5 shadow-[0_12px_28px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.15)] flex flex-col items-center gap-0.5"
        >
            <div className="text-[11px] font-bold font-mono">
                {hoveredDay.count > 0 ? (
                    <span className="text-[#E8C15A]">{hoveredDay.count} solve{hoveredDay.count === 1 ? '' : 's'}</span>
                ) : (
                    <span className="text-white/50">No practice</span>
                )}
            </div>
            <div className="text-[10px] text-white/70 font-mono whitespace-nowrap">
                {formatTooltipDate(hoveredDay.date)}
            </div>
            {/* Pointer arrow */}
            <div className="w-2 h-2 bg-[#18181B] border-r border-b border-white/20 rotate-45 -mb-2 mt-0.5" />
        </div>,
        document.body
    ) : null;

    return (
        <div className="bg-[#121214]/90 border border-white/[0.08] rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl flex flex-col w-full">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between pb-3 mb-2 border-b border-white/[0.06] gap-2">
                <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-[#E8C15A]/10 text-[#E8C15A] flex items-center justify-center">
                        <Flame size={13} />
                    </div>
                    <h2 className="text-xs font-semibold text-white/90 tracking-tight">
                        Yearly Practice Consistency
                    </h2>
                </div>

                <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5 font-mono">
                        <span className="text-white/40 text-[10px] uppercase">Solves:</span>
                        <span className="text-[#E8C15A] font-semibold">{totalSolves}</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono">
                        <span className="text-white/40 text-[10px] uppercase">Active:</span>
                        <span className="text-white/90 font-semibold">{activeDays}d</span>
                    </div>
                </div>
            </div>

            {/* Expansive Full-Width Heatmap Grid */}
            <div className="w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-2">
                <div className="min-w-[720px] relative">
                    {/* Month labels along the top */}
                    <div className="flex text-[10px] text-white/40 font-mono mb-1 pl-6 justify-between pr-2">
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
                                            onMouseEnter={(e) => {
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                setHoveredDay({
                                                    date: day.date,
                                                    count: day.count,
                                                    x: rect.left + rect.width / 2,
                                                    y: rect.top,
                                                });
                                            }}
                                            onMouseLeave={() => setHoveredDay(null)}
                                            className={`aspect-square w-full min-w-[10px] max-w-[14px] rounded-xs transition-transform hover:scale-125 cursor-pointer ${getIntensityClass(day.count)}`}
                                        />
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Minimalist Legend */}
            <div className="flex items-center justify-end mt-2 pt-2 border-t border-white/[0.06] text-[10px] text-white/40 font-mono">
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

            {/* Portal-rendered Tooltip (Immune to parent backdrop-blur / overflow containing block traps) */}
            {tooltipElement}
        </div>
    );
}
