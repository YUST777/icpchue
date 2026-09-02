'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
    LayoutDashboard, BarChart3, FileCode2, Terminal, 
    FileText, AlertTriangle 
} from 'lucide-react';

export const TABS = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'progress', label: 'Progress Matrix', icon: BarChart3 },
    { id: 'submissions', label: 'Submissions', icon: FileCode2 },
    { id: 'workspace', label: 'Code & Notes', icon: Terminal },
    { id: 'notes', label: 'Student Notes', icon: FileText },
    { id: 'flags', label: 'Warnings & Flags', icon: AlertTriangle },
] as const;

export type TabId = typeof TABS[number]['id'];

interface TraineeTabNavProps {
    activeTab: TabId;
    onChange: (tab: TabId) => void;
    flagsCount?: number;
}

export function TraineeTabNav({ activeTab, onChange, flagsCount = 0 }: TraineeTabNavProps) {
    const visibleTabs = TABS.filter(t => t.id !== 'flags' || flagsCount > 0);

    return (
        <div className="border-b border-white/10 overflow-x-auto scrollbar-hide flex gap-1 bg-[#121214]/80 p-1.5 rounded-xl backdrop-blur-md">
            {visibleTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                    <button
                        key={tab.id}
                        onClick={() => onChange(tab.id)}
                        className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                            isActive
                                ? 'text-[#E8C15A] bg-[#E8C15A]/10 shadow-xs'
                                : 'text-white/50 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <Icon size={14} />
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
