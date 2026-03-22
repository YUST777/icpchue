import { CFProblemData, Submission } from './types';
import type { AnalyticsStats } from './shared/types';
import { CFProblemDescription } from './CFProblemDescription';
import SubmissionsList from './SubmissionsList';
import AnalyticsView from './AnalyticsView';
import HandleInputSection from './HandleInputSection';
import SolutionView from './SolutionView';

interface ProblemContentProps {
    activeTab: 'description' | 'submissions' | 'analytics' | 'solution';
    cfData: CFProblemData | null;
    submissions: Submission[];
    submissionsLoading: boolean;
    cfStats?: { rating?: number; solvedCount: number; tags?: string[] } | null;
    stats?: AnalyticsStats | null;
    statsLoading?: boolean;
    contestId: string | string[];
    problemId: string | string[];
    cfHandle: string | null;
    handleLoading: boolean;
    onHandleSave: (handle: string) => void;
    sheetSlug?: string;
    levelSlug?: string;
}

import DescriptionTab from './DescriptionTab';
import SubmissionsTab from './SubmissionsTab';
import AnalyticsTab from './AnalyticsTab';
import SolutionTab from './SolutionTab';

export default function ProblemContent({
    activeTab,
    cfData,
    submissions,
    submissionsLoading,
    cfStats,
    stats,
    statsLoading,
    contestId,
    problemId,
    cfHandle,
    handleLoading,
    onHandleSave,
    sheetSlug,
    levelSlug
}: ProblemContentProps) {
    const safeContestId = Array.isArray(contestId) ? contestId[0] : contestId;
    const safeProblemId = Array.isArray(problemId) ? problemId[0] : problemId;

    return (
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 md:space-y-6 scrollbar-thin scrollbar-thumb-white/10 min-h-0 relative font-sans">
            {activeTab === 'description' && (
                <DescriptionTab cfData={cfData} />
            )}

            {activeTab === 'submissions' && (
                <SubmissionsTab
                    submissions={submissions}
                    submissionsLoading={submissionsLoading}
                    cfHandle={cfHandle}
                    handleLoading={handleLoading}
                    onHandleSave={onHandleSave}
                    contestId={safeContestId}
                    problemId={safeProblemId}
                />
            )}

            {activeTab === 'analytics' && (
                <AnalyticsTab
                    stats={stats ?? null}
                    cfStats={cfStats}
                    statsLoading={!!statsLoading}
                />
            )}

            {activeTab === 'solution' && (
                <SolutionTab
                    contestId={safeContestId}
                    problemId={safeProblemId}
                    sheetSlug={sheetSlug}
                    levelSlug={levelSlug}
                />
            )}
        </div>
    );
}
