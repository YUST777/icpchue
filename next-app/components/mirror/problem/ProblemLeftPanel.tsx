import React from 'react';
import dynamic from 'next/dynamic';
import { CFProblemData, Submission } from '../shared/types';
import { CFProblemDescription } from './CFProblemDescription';
import ProblemTabs from './ProblemTabs';
import HandleInputSection from '../HandleInputSection';
import ProblemNotes from './ProblemNotes';

// Lazy-load heavy tab components — only loaded when user switches to that tab
const SubmissionsList = dynamic(() => import('../SubmissionsList'), {
    loading: () => <div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" /></div>,
});
const AnalyticsView = dynamic(() => import('../AnalyticsView'), {
    loading: () => <div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" /></div>,
});
const SolutionView = dynamic(() => import('../SolutionView'), {
    loading: () => <div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" /></div>,
});
const Whiteboard = dynamic(() => import('../Whiteboard'), {
    loading: () => <div className="h-20 bg-[#121212]" />,
});

interface ProblemLeftPanelProps {
    activeTab: 'description' | 'submissions' | 'analytics' | 'solution';
    setActiveTab: (tab: 'description' | 'submissions' | 'analytics' | 'solution') => void;
    isWhiteboardExpanded: boolean;
    setIsWhiteboardExpanded: (expanded: boolean) => void;
    cfData: CFProblemData | null;
    submissions: Submission[];
    submissionsLoading: boolean;
    cfStats: { rating?: number; solvedCount: number } | null;
    contestId: string;
    problemId: string;
    whiteboardHeight: number;
    handleWhiteboardResizeStart: (e: React.MouseEvent) => void;
    analyzeComplexity: () => void;
    complexityLoading: boolean;
    leftPanelRef: React.RefObject<HTMLDivElement>;
    lastWidth: React.MutableRefObject<number>;
    mobileView: 'problem' | 'code';
    cfHandle: string | null;
    handleLoading: boolean;
    onHandleSave: (handle: string) => void;
    onViewCode: (id: number) => void;
    sheetSlug?: string;
    levelSlug?: string;
    urlType: 'contest' | 'group';
    groupId?: string;
    stats?: any | null;
    statsLoading?: boolean;
    showNotes: boolean;
    setShowNotes: (show: boolean) => void;
}

function ProblemLeftPanel({
    activeTab,
    setActiveTab,
    isWhiteboardExpanded,
    setIsWhiteboardExpanded,
    cfData,
    submissions,
    submissionsLoading,
    cfStats,
    contestId,
    problemId,
    whiteboardHeight,
    handleWhiteboardResizeStart,
    analyzeComplexity,
    complexityLoading,
    leftPanelRef,
    lastWidth,
    mobileView,
    cfHandle,
    handleLoading,
    onHandleSave,
    onViewCode,
    sheetSlug,
    levelSlug,
    urlType,
    groupId,
    stats,
    statsLoading,
    showNotes,
    setShowNotes
}: ProblemLeftPanelProps) {
    const safeContestId = contestId || '0';
    const safeProblemId = problemId || 'A';

    return (
        <div
            ref={leftPanelRef}
            id="onboarding-left-panel"
            className={`problem-panel flex flex-col bg-[#0B0B0C] border-r border-white/5 relative ${mobileView === 'code' ? 'hidden md:flex md:w-0 md:flex-none' : 'flex w-full md:w-[var(--panel-width)] md:flex-none'} min-w-0 h-full overflow-hidden`}
            data-lenis-prevent="true"
            style={{
                '--panel-width': `${lastWidth.current}%`,
                willChange: 'width, flex-basis',
                WebkitOverflowScrolling: 'touch'
            } as React.CSSProperties}
        >
            <ProblemTabs
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                isWhiteboardExpanded={isWhiteboardExpanded}
                setIsWhiteboardExpanded={setIsWhiteboardExpanded}
            />

            <div className="flex-1 min-h-0 relative bg-[#0B0B0C]">
                {/* Content Area with Tabs */}
                {activeTab === 'description' && (
                    <div
                        className="absolute inset-0 overflow-y-auto overflow-x-hidden p-4 sm:p-6 space-y-4 sm:space-y-6 custom-scrollbar"
                        data-lenis-prevent="true"
                    >
                        {cfData && <CFProblemDescription data={cfData} />}
                    </div>
                )}
                {activeTab === 'submissions' && (
                    <div
                        className="absolute inset-0 overflow-hidden flex flex-col"
                        data-lenis-prevent="true"
                    >
                        <SubmissionsList
                            submissions={submissions}
                            loading={submissionsLoading}
                            onViewCode={onViewCode}
                            contestId={safeContestId}
                            problemIndex={safeProblemId}
                            urlType={urlType}
                            groupId={groupId}
                        />
                    </div>
                )}
                {activeTab === 'analytics' && (
                    <div
                        className="absolute inset-0 overflow-y-auto p-4 sm:p-6 custom-scrollbar"
                        data-lenis-prevent="true"
                    >
                        <AnalyticsView
                            stats={stats}
                            cfStats={cfStats}
                            loading={!!statsLoading}
                        />
                    </div>
                )}
                {activeTab === 'solution' && (
                    <div
                        className="absolute inset-0 overflow-hidden"
                        data-lenis-prevent="true"
                    >
                        <SolutionView
                            problemId={problemId}
                            contestId={contestId}
                            sheetSlug={sheetSlug}
                            levelSlug={levelSlug}
                        />
                    </div>
                )}

                {/* Notes Overlay — Covers EVERYTHING in the content area when open */}
                {showNotes && (
                    <div
                        className="absolute inset-0 z-50 overflow-hidden flex flex-col animate-in fade-in slide-in-from-left-2 duration-300 bg-[#121212]"
                        data-lenis-prevent="true"
                    >
                        <ProblemNotes 
                            contestId={safeContestId} 
                            problemIndex={safeProblemId} 
                        />
                    </div>
                )}
            </div>

            {/* Whiteboard Component at the bottom — manages its own isExpanded/height via store */}
            <Whiteboard
                contestId={contestId}
                problemIndex={problemId}
            />
        </div>
    );
}

export default React.memo(ProblemLeftPanel);
