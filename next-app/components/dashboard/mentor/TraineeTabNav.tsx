'use client';

import React from 'react';
import { 
    LayoutDashboard, BarChart3, FileCode2, Terminal, 
    ShieldAlert, Flame, Timer, PlayCircle, ChevronDown
} from 'lucide-react';

export const TABS = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'progress', label: 'Progress Matrix', icon: BarChart3 },
    { id: 'time', label: 'Time & Focus', icon: Timer },
    { id: 'sessions', label: 'Sessions', icon: PlayCircle },
    { id: 'discipline', label: 'Study Log', icon: Flame },
    { id: 'submissions', label: 'Submissions', icon: FileCode2 },
    { id: 'workspace', label: 'Code Inspector', icon: Terminal },
    { id: 'flags', label: 'Cheating Flags', icon: ShieldAlert },
] as const;

export type TabId = typeof TABS[number]['id'];

interface TraineeTabNavProps {
    activeTab: TabId;
    onChange: (tab: TabId) => void;
    flagsCount?: number;
}

export function TraineeTabNav({ activeTab, onChange, flagsCount = 0 }: TraineeTabNavProps) {
    const currentTab = TABS.find((tab) => tab.id === activeTab) || TABS[0];
    const CurrentIcon = currentTab.icon;

    return (
        <nav aria-label="Trainee sections" className="w-full min-w-0 border-b border-white/[0.08] bg-[#121214]/90 p-1.5 rounded-2xl backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.06)]">
            <div className="relative sm:hidden">
                <CurrentIcon size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#E8C15A]" />
                <select
                    aria-label="Trainee section"
                    value={currentTab.id}
                    onChange={(event) => onChange(event.target.value as TabId)}
                    className="min-h-11 w-full min-w-0 appearance-none rounded-xl border border-[#E8C15A]/25 bg-[#1c1911] py-2 pl-10 pr-10 text-base font-medium text-[#E8C15A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8C15A]/70"
                >
                    {TABS.map((tab) => (
                        <option key={tab.id} value={tab.id}>
                            {tab.label}{tab.id === 'flags' && flagsCount > 0 ? ` (${flagsCount})` : ''}
                        </option>
                    ))}
                </select>
                <ChevronDown size={16} aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#E8C15A]/70" />
            </div>
            <div className="hidden flex-wrap gap-1 sm:flex">
            {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                    <button
                        key={tab.id}
                        type="button"
                        aria-current={isActive ? 'page' : undefined}
                        onClick={() => onChange(tab.id)}
                        className={`flex min-h-11 min-w-0 items-center gap-2 px-2.5 py-2.5 rounded-xl text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8C15A]/70 sm:min-h-9 sm:px-3.5 sm:py-1.5 ${
                            isActive
                                ? 'text-[#E8C15A] bg-[#E8C15A]/15 font-semibold shadow-[inset_0_1px_0_rgba(232,193,90,0.25)] border border-[#E8C15A]/25'
                                : 'text-white/50 hover:text-white/90 hover:bg-white/[0.04] border border-transparent'
                        }`}
                    >
                        <Icon size={14} className={`shrink-0 ${isActive ? 'text-[#E8C15A]' : 'text-white/40'}`} />
                        <span className="min-w-0 text-left sm:whitespace-nowrap">{tab.label}</span>
                        {tab.id === 'flags' && flagsCount > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-semibold bg-red-500/20 text-red-400 border border-red-500/30">
                                {flagsCount}
                            </span>
                        )}
                    </button>
                );
            })}
            </div>
        </nav>
    );
}
