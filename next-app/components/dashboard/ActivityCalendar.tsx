'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CalendarDay } from '@/hooks/useDashboardStats';

interface ActivityCalendarProps {
    weeks: CalendarDay[][];
    totalSubmissions: number;
    todayStr: string;
}

export function ActivityCalendar({ weeks, totalSubmissions, todayStr }: ActivityCalendarProps) {
    const [hoveredDate, setHoveredDate] = useState<string | null>(null);

    const submissionsInView = weeks.reduce((total, week) => total + week.reduce((weekTotal, day) => weekTotal + day.count, 0), 0);

    return (
        <div className="bg-[#0d0d0d] rounded-2xl border border-white/5 p-5 w-full max-w-full">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2 sm:gap-0 relative z-10">
                <span className="text-sm font-medium text-white">
                    {submissionsInView} submissions in the last 3 months
                </span>
                <div className="flex items-center gap-1.5 text-[10px] text-white/40">
                    <span>Less</span>
                    {[0.1, 0.3, 0.5, 0.7, 1].map((o, i) => (
                        <div
                            key={i}
                            className="w-2.5 h-2.5 rounded-sm"
                            style={{ backgroundColor: `rgba(232,193,90,${o})` }}
                        />
                    ))}
                    <span>More</span>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="overflow-x-auto pb-4 pt-4 w-full scrollbar-hide">
                <div className="flex gap-1 min-w-fit px-1">
                    {/* Day labels */}
                    <div className="flex flex-col gap-1 mr-2 text-[10px] text-white/30 sticky left-0 bg-[#0d0d0d] z-20 pr-2">
                        <div className="h-2.5"></div>
                        <div className="h-2.5 flex items-center">Mon</div>
                        <div className="h-2.5"></div>
                        <div className="h-2.5 flex items-center">Wed</div>
                        <div className="h-2.5"></div>
                        <div className="h-2.5 flex items-center">Fri</div>
                        <div className="h-2.5"></div>
                    </div>

                    {/* Weeks */}
                    {weeks.map((week, wi) => (
                        <div key={wi} className="flex flex-col gap-1">
                            {week.map(({ date, count }, di) => {
                                const opacity = count === 0 ? 0.1 : count <= 1 ? 0.3 : count <= 2 ? 0.5 : count <= 4 ? 0.7 : 1;
                                const isToday = date === todayStr;
                                const d = new Date(date);
                                const displayDate = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                                const submissionLabel = `${count} submission${count !== 1 ? 's' : ''}`;
                                const isHovered = hoveredDate === date;

                                const isSheetDrop = date === '2025-12-24';
                                const isTopRow = di < 2;

                                // Custom tooltip logic for special dates
                                let specialLabel = '';
                                if (isSheetDrop) specialLabel = 'Sheet-1 Dropped!';

                                return (
                                    <div
                                        key={date}
                                        className="relative"
                                        onMouseEnter={() => setHoveredDate(date)}
                                        onMouseLeave={() => setHoveredDate(null)}
                                    >
                                        <div
                                            className={`w-2.5 h-2.5 rounded-sm cursor-pointer transition-all hover:scale-125 
                                                ${isToday ? 'ring-1 ring-[#E8C15A]' : ''} 
                                                ${isSheetDrop ? 'bg-red-500' : ''}
                                            `}
                                            style={!isSheetDrop ? { backgroundColor: `rgba(232,193,90,${opacity})` } : undefined}
                                        />

                                        <AnimatePresence>
                                            {isHovered && (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.9, y: isTopRow ? -5 : 5 }}
                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.9, y: isTopRow ? -5 : 5 }}
                                                    transition={{ duration: 0.15, ease: "easeOut" }}
                                                    className={`absolute ${isTopRow ? 'top-full mt-2' : 'bottom-full mb-2'} left-1/2 -translate-x-1/2 z-[100] pointer-events-none`}
                                                >
                                                    <div className={`px-3 py-2 rounded-lg border shadow-2xl whitespace-nowrap flex flex-col items-center ${isSheetDrop ? 'bg-red-950/90 border-red-500/30' : 'bg-[#171718] border-white/10 shadow-black/50'}`}>
                                                        <span className={`text-xs font-semibold ${isSheetDrop ? 'text-red-400' : 'text-[#E8C15A]'}`}>
                                                            {isSheetDrop ? specialLabel : submissionLabel}
                                                        </span>
                                                        {!isSheetDrop || count > 0 ? (
                                                            <span className="text-[10px] text-white/50">{displayDate}</span>
                                                        ) : null}
                                                        {isSheetDrop && count > 0 && (
                                                            <span className="text-[10px] text-white/50">{count} submissions</span>
                                                        )}

                                                        {/* Arrow */}
                                                        <div className={`absolute ${isTopRow ? 'bottom-full left-1/2 -translate-x-1/2 -mb-1.5 border-l border-t' : 'top-full left-1/2 -translate-x-1/2 -mt-1.5 border-r border-b'} w-3 h-3 rotate-45 ${isSheetDrop ? 'bg-red-950/90 border-red-500/30' : 'bg-[#171718] border-white/10'}`}></div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
