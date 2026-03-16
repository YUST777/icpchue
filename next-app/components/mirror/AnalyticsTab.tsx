import { Submission } from './types';
import AnalyticsView from './AnalyticsView';

interface AnalyticsTabProps {
    submissions: Submission[];
    cfStats: { rating?: number; solvedCount: number } | null;
    submissionsLoading: boolean;
}

export default function AnalyticsTab({
    submissions,
    cfStats,
    submissionsLoading
}: AnalyticsTabProps) {
    return (
        <AnalyticsView
            submissions={submissions}
            cfStats={cfStats}
            loading={submissionsLoading}
        />
    );
}
