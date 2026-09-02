'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
    LayoutDashboard, BarChart3, FileCode2, Terminal, 
    FileText, Activity, Trophy, AlertTriangle 
} from 'lucide-react';

export const TABS = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'progress', label: 'Progress', icon: BarChart3 },
    { id: 'submissions', label: 'Submissions', icon: FileCode2 },
    { id: 'workspace', label: 'Code & Workspaces', icon: Terminal },
    { id: 'notes', label: 'Notes', icon: FileText },
    { id: 'activity', label: 'Activity', icon: Activity },
    { id: 'achievements', label: 'Achievements', icon: Trophy },
    { id: 'flags', label: 'Warnings & Flags', icon: AlertTriangle },
] as const;

export type TabId = typeof TABS[number]['id'];

interface TraineeTabNavProps {
    activeTab: TabId;
    onChange: (tab: TabId) => void;
    flagsCount?: number;
}

export function TraineeTabNav({ activeTab, onChange, flagsCount = 0 }: TraineeTabNavProps) {
    return (
        <div className="border-b border-white/10 overflow-x-auto scrollbar-hide flex gap-1 bg-[#121214]/60 p-1.5 rounded-2xl backdrop-blur-md">
            {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                    <button
                        key={tab.id}
                        onClick={() => onChange(tab.id)}
                        className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs md:text-sm font-semibold whitespace-nowrap transition-all ${
                            isActive
                                ? 'text-[#E8C15A] bg-[#E8C15A]/10 shadow-sm'
                                : 'text-white/50 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <Icon size={16} />
                        <span>{tab.label}</span>
                        {tab.id === 'flags' && flagsCount > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                                {flagsCount}
                            </span>
                        )}
                        {isActive && (
                            <motion.div
                                layoutId="activeTraineeTabPill"
                                className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#E8C15A] rounded-full shadow-[0_0_8px_#E8C15A]"
                                transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                            />
                        )}
                    </button>
                );
            })}
        </div>
    );
}
