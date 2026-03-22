import AnalyticsView from './AnalyticsView';
import type { AnalyticsStats } from './shared/types';

interface AnalyticsTabProps {
    stats: AnalyticsStats | null;
    cfStats?: { rating?: number; solvedCount: number; tags?: string[] } | null;
    statsLoading: boolean;
}

export default function AnalyticsTab({
    stats,
    cfStats,
    statsLoading
}: AnalyticsTabProps) {
    return (
        <AnalyticsView
            stats={stats}
            cfStats={cfStats}
            loading={statsLoading}
        />
    );
}
