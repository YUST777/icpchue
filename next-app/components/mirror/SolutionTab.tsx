import SolutionView from './SolutionView';

interface SolutionTabProps {
    contestId: string;
    problemId: string;
    sheetSlug?: string;
    levelSlug?: string;
}

export default function SolutionTab({
    contestId,
    problemId,
    sheetSlug,
    levelSlug
}: SolutionTabProps) {
    return (
        <SolutionView
            contestId={contestId}
            problemId={problemId}
            sheetSlug={sheetSlug}
            levelSlug={levelSlug}
        />
    );
}
