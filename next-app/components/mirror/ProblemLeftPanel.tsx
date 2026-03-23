import { CFProblemData, Submission } from './types';
import { CFProblemDescription } from './CFProblemDescription';
import SubmissionsList from './SubmissionsList';
import AnalyticsView from './AnalyticsView';
import ProblemTabs from './ProblemTabs';
import HandleInputSection from './HandleInputSection';
import SolutionView from './SolutionView';
import ProblemContent from './ProblemContent';
import WhiteboardSection from './WhiteboardSection';

interface ProblemLeftPanelProps {
    activeTab: 'description' | 'submissions' | 'analytics' | 'solution';
    setActiveTab: (tab: 'description' | 'submissions' | 'analytics' | 'solution') => void;
    cfData: CFProblemData | null;
    submissions: Submission[];
    submissionsLoading: boolean;
    cfStats: { rating?: number; solvedCount: number } | null;
    contestId: string;
    problemId: string;
    handleWhiteboardResizeStart: (e: React.MouseEvent | React.TouchEvent) => void;
    whiteboardHeight: number;
    leftPanelRef: React.RefObject<HTMLDivElement | null>;
    lastWidth: React.MutableRefObject<number>;
    mobileView: 'problem' | 'code';
    cfHandle: string | null;
    handleLoading: boolean;
    onHandleSave: (handle: string) => void;
    sheetSlug?: string;
    levelSlug?: string;
}

export default function ProblemLeftPanel({
    activeTab,
    setActiveTab,
    cfData,
    submissions,
    submissionsLoading,
    cfStats,
    contestId,
    problemId,
    handleWhiteboardResizeStart,
    leftPanelRef,
    lastWidth,
    mobileView,
    cfHandle,
    handleLoading,
    onHandleSave,
    sheetSlug,
    levelSlug
}: ProblemLeftPanelProps) {
    const safeContestId = Array.isArray(contestId) ? contestId[0] : contestId;
    const safeProblemId = Array.isArray(problemId) ? problemId[0] : problemId;

    return (
        <div
            id="onboarding-left-panel"
            ref={leftPanelRef}
            className={`problem-panel flex flex-col bg-[#121212] ${mobileView === 'code' ? 'hidden md:flex' : 'flex'} w-full md:w-auto`}
            style={{
                '--panel-width': `${lastWidth.current}%`,
                willChange: 'width'
            } as React.CSSProperties}
        >
            <ProblemTabs
                activeTab={activeTab}
                setActiveTab={setActiveTab}
            />

            <ProblemContent
                activeTab={activeTab}
                cfData={cfData}
                submissions={submissions}
                submissionsLoading={submissionsLoading}
                cfStats={cfStats}
                contestId={contestId}
                problemId={problemId}
                cfHandle={cfHandle}
                handleLoading={handleLoading}
                onHandleSave={onHandleSave}
                sheetSlug={sheetSlug}
                levelSlug={levelSlug}
            />

            <WhiteboardSection
                contestId={contestId}
                problemId={problemId}
                onResizeStart={handleWhiteboardResizeStart}
            />
        </div>
    );
}
