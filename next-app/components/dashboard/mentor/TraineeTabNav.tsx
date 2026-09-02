'use client';

import React from 'react';
import { 
    LayoutDashboard, BarChart3, FileCode2, Terminal, 
    ShieldAlert 
} from 'lucide-react';

export const TABS = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'progress', label: 'Progress Matrix', icon: BarChart3 },
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
    return (
        <div className="border-b border-white/[0.08] overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden flex gap-1 bg-[#121214]/90 p-1.5 rounded-2xl backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.06)]">
            {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                    <button
                        key={tab.id}
                        onClick={() => onChange(tab.id)}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all active:scale-[0.98] ${
                            isActive
                                ? 'text-[#E8C15A] bg-[#E8C15A]/15 font-semibold shadow-[inset_0_1px_0_rgba(232,193,90,0.25)] border border-[#E8C15A]/25'
                                : 'text-white/50 hover:text-white/90 hover:bg-white/[0.04] border border-transparent'
                        }`}
                    >
                        <Icon size={14} className={isActive ? 'text-[#E8C15A]' : 'text-white/40'} />
                        <span>{tab.label}</span>
                        {tab.id === 'flags' && flagsCount > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-semibold bg-red-500/20 text-red-400 border border-red-500/30">
                                {flagsCount}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
