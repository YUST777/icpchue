import React from 'react';
import { CFProblemData, Submission } from '../shared/types';
import { CFProblemDescription } from './CFProblemDescription';
import SubmissionsList from '../SubmissionsList';
import AnalyticsView from '../AnalyticsView';
import Whiteboard from '../Whiteboard';
import ProblemTabs from './ProblemTabs';
import HandleInputSection from '../HandleInputSection';
import SolutionView from '../SolutionView';

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
    sheetSlug?: string;
    levelSlug?: string;
    statsLoading?: boolean;
    stats?: any;
}

export default function ProblemLeftPanel({
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
    sheetSlug,
    levelSlug,
    statsLoading,
}: ProblemLeftPanelProps) {
    const safeContestId = Array.isArray(contestId) ? contestId[0] : contestId;
    const safeProblemId = (Array.isArray(problemId) ? problemId[0] : problemId).toUpperCase();

    return (
        <div
            ref={leftPanelRef}
            id="onboarding-left-panel"
            className={`problem-panel flex flex-col bg-[#121212] ${mobileView === 'code' ? 'hidden md:flex md:w-0 md:flex-none' : 'flex w-full md:w-[var(--panel-width)] md:flex-none'} min-w-0 h-full overflow-hidden`}
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

            <div className="flex-1 min-h-0 flex flex-col relative">
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
                        {!handleLoading && !cfHandle ? (
                            <div className="flex items-center justify-center py-12 px-4">
                                <HandleInputSection onSave={onHandleSave} compact />
                            </div>
                        ) : (
                            <SubmissionsList
                                submissions={submissions}
                                loading={submissionsLoading}
                                onViewCode={() => { }}
                                contestId={safeContestId}
                                problemIndex={safeProblemId}
                            />
                        )}
                    </div>
                )}
                {activeTab === 'analytics' && (
                    <div
                        className="absolute inset-0 overflow-y-auto overflow-x-hidden p-4 sm:p-6 space-y-4 sm:space-y-6 custom-scrollbar"
                        data-lenis-prevent="true"
                    >
                        <AnalyticsView
                            submissions={submissions}
                            cfStats={cfStats}
                            loading={statsLoading !== undefined ? statsLoading : submissionsLoading}
                        />
                    </div>
                )}
                {activeTab === 'solution' && (
                    <div
                        className="absolute inset-0 flex flex-col"
                        data-lenis-prevent="true"
                    >
                        <SolutionView
                            contestId={safeContestId}
                            problemId={safeProblemId}
                            sheetSlug={sheetSlug}
                            levelSlug={levelSlug}
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
