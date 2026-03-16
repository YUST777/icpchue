import { FileText, History as HistoryIcon, BarChart2, Play, PenTool } from 'lucide-react';
import { useWhiteboardStore } from '@/hooks/contest/useWhiteboardStore';

interface ProblemTabsProps {
    activeTab: 'description' | 'submissions' | 'analytics' | 'solution';
    setActiveTab: (tab: 'description' | 'submissions' | 'analytics' | 'solution') => void;
}

export default function ProblemTabs({
    activeTab,
    setActiveTab,
}: ProblemTabsProps) {
    const { isExpanded: isWhiteboardExpanded, toggleExpanded: setIsWhiteboardExpanded } = useWhiteboardStore();

    // Shared button class for consistent styling
    const getTabClass = (isActive: boolean) => `
        flex items-center gap-2 px-4 py-3 
        text-xs font-medium transition-all touch-manipulation shrink-0 relative
        ${isActive
            ? 'text-white'
            : 'text-white/40 hover:text-white hover:bg-white/5'
        }
    `;

    const activeIndicator = (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#E8C15A] shadow-[0_0_8px_rgba(232,193,90,0.5)]" />
    );

    return (
        <div className="flex border-b border-white/10 bg-[#121212] overflow-x-auto scrollbar-hide">
            <button
                onClick={() => setActiveTab('description')}
                className={getTabClass(activeTab === 'description')}
            >
                <FileText size={16} className={activeTab === 'description' ? 'text-[#E8C15A]' : ''} />
                <span className="whitespace-nowrap">Description</span>
                {activeTab === 'description' && activeIndicator}
            </button>
            <button
                id="onboarding-tab-submissions"
                onClick={() => setActiveTab('submissions')}
                className={getTabClass(activeTab === 'submissions')}
            >
                <HistoryIcon size={16} className={activeTab === 'submissions' ? 'text-[#E8C15A]' : ''} />
                <span className="whitespace-nowrap">Submissions</span>
                {activeTab === 'submissions' && activeIndicator}
            </button>
            <button
                id="onboarding-tab-analytics"
                onClick={() => setActiveTab('analytics')}
                className={getTabClass(activeTab === 'analytics')}
            >
                <BarChart2 size={16} className={activeTab === 'analytics' ? 'text-[#E8C15A]' : ''} />
                <span className="whitespace-nowrap">Analytics</span>
                {activeTab === 'analytics' && activeIndicator}
            </button>
            <button
                onClick={() => setActiveTab('solution')}
                className={getTabClass(activeTab === 'solution')}
            >
                <Play size={16} className={activeTab === 'solution' ? 'text-[#E8C15A]' : ''} />
                <span className="whitespace-nowrap">Solution</span>
                {activeTab === 'solution' && activeIndicator}
            </button>

            <div className="w-px h-6 bg-white/10 my-auto mx-1 shrink-0" />

            <button
                onClick={() => setIsWhiteboardExpanded()}
                className={`
                    flex items-center gap-2 px-4 py-3 
                    text-xs font-medium transition-all touch-manipulation shrink-0
                    ${isWhiteboardExpanded ? 'text-[#E8C15A] bg-white/5' : 'text-white/40 hover:text-white hover:bg-white/5'}
                `}
                title="Toggle Whiteboard"
            >
                <PenTool size={16} />
                <span className="whitespace-nowrap">Whiteboard</span>
            </button>
        </div>
    );
}
