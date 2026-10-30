import { FileText, History, BarChart2, PenTool, PlayCircle } from 'lucide-react';
import { Tooltip } from '@/components/ui/Tooltip';
import { motion } from 'framer-motion';

interface ProblemTabsProps {
    activeTab: 'description' | 'submissions' | 'analytics' | 'solution';
    setActiveTab: (tab: 'description' | 'submissions' | 'analytics' | 'solution') => void;
    isWhiteboardExpanded: boolean;
    setIsWhiteboardExpanded: (expanded: boolean) => void;
}

export default function ProblemTabs({
    activeTab,
    setActiveTab,
    isWhiteboardExpanded,
    setIsWhiteboardExpanded
}: ProblemTabsProps) {
    return (
        <div
            className="flex border-b border-white/10 bg-[#1a1a1a] overflow-x-auto overflow-y-hidden scrollbar-hide shrink-0 relative"
            data-lenis-prevent
            style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}
        >
            <button
                id="onboarding-tab-description"
                onClick={() => setActiveTab('description')}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 sm:py-3 text-[10px] sm:text-xs font-medium transition-colors touch-manipulation shrink-0 min-h-[44px] relative ${activeTab === 'description' ? 'text-white bg-[#121212]' : 'text-[#666] active:text-[#A0A0A0]'}`}
            >
                <Tooltip content="Problem Description" position="bottom">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                        <FileText size={12} className="sm:w-[14px] sm:h-[14px]" />
                        <span className="whitespace-nowrap">Description</span>
                    </div>
                </Tooltip>
                {activeTab === 'description' && (
                    <motion.div
                        layoutId="problem-tabs-active-bar"
                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#E8C15A]"
                        transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                )}
            </button>

            <button
                id="onboarding-tab-submissions"
                onClick={() => setActiveTab('submissions')}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 sm:py-3 text-[10px] sm:text-xs font-medium transition-colors touch-manipulation shrink-0 min-h-[44px] relative ${activeTab === 'submissions' ? 'text-white bg-[#121212]' : 'text-[#666] active:text-[#A0A0A0]'}`}
            >
                <Tooltip content="View Submissions" position="bottom">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                        <History size={12} className="sm:w-[14px] sm:h-[14px]" />
                        <span className="whitespace-nowrap">Submissions</span>
                    </div>
                </Tooltip>
                {activeTab === 'submissions' && (
                    <motion.div
                        layoutId="problem-tabs-active-bar"
                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#E8C15A]"
                        transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                )}
            </button>

            <button
                id="onboarding-tab-analytics"
                onClick={() => setActiveTab('analytics')}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 sm:py-3 text-[10px] sm:text-xs font-medium transition-colors touch-manipulation shrink-0 min-h-[44px] relative ${activeTab === 'analytics' ? 'text-white bg-[#121212]' : 'text-[#666] active:text-[#A0A0A0]'}`}
            >
                <Tooltip content="Problem Analytics" position="bottom">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                        <BarChart2 size={12} className="sm:w-[14px] sm:h-[14px]" />
                        <span className="whitespace-nowrap">Analytics</span>
                    </div>
                </Tooltip>
                {activeTab === 'analytics' && (
                    <motion.div
                        layoutId="problem-tabs-active-bar"
                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#E8C15A]"
                        transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                )}
            </button>

            <button
                id="onboarding-tab-solution"
                onClick={() => setActiveTab('solution')}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 sm:py-3 text-[10px] sm:text-xs font-medium transition-colors touch-manipulation shrink-0 min-h-[44px] relative ${activeTab === 'solution' ? 'text-white bg-[#121212]' : 'text-[#666] active:text-[#A0A0A0]'}`}
            >
                <Tooltip content="View Solution" position="bottom">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                        <PlayCircle size={12} className="sm:w-[14px] sm:h-[14px]" />
                        <span className="whitespace-nowrap">Solution</span>
                    </div>
                </Tooltip>
                {activeTab === 'solution' && (
                    <motion.div
                        layoutId="problem-tabs-active-bar"
                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#E8C15A]"
                        transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                )}
            </button>

            <button
                onClick={() => setIsWhiteboardExpanded(!isWhiteboardExpanded)}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 sm:py-3 text-[10px] sm:text-xs font-medium transition-colors border-l border-white/5 shrink-0 min-h-[44px] touch-manipulation ${isWhiteboardExpanded ? 'text-[#E8C15A] bg-[#1e1e1e]' : 'text-[#666] active:text-[#A0A0A0]'}`}
            >
                <Tooltip content="Toggle Whiteboard" position="bottom">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                        <PenTool size={12} className="sm:w-[14px] sm:h-[14px]" />
                        <span className="whitespace-nowrap">Whiteboard</span>
                    </div>
                </Tooltip>
            </button>
        </div>
    );
}
