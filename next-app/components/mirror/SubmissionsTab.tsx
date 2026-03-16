import { Submission } from './types';
import SubmissionsList from './SubmissionsList';
import HandleInputSection from './HandleInputSection';

interface SubmissionsTabProps {
    submissions: Submission[];
    submissionsLoading: boolean;
    cfHandle: string | null;
    handleLoading: boolean;
    onHandleSave: (handle: string) => void;
    contestId: string;
    problemId: string;
}

export default function SubmissionsTab({
    submissions,
    submissionsLoading,
    cfHandle,
    handleLoading,
    onHandleSave,
    contestId,
    problemId
}: SubmissionsTabProps) {
    return (
        <div className="space-y-4">
            {cfHandle && (
                <div className="flex items-center justify-between bg-[#1a1a1a] px-3 py-2 rounded-lg border border-white/5">
                    <span className="text-xs text-[#888]">Connected as:</span>
                    <span className="text-xs font-bold text-[#E8C15A] font-mono">{cfHandle}</span>
                </div>
            )}
            {!handleLoading && !cfHandle && (
                <div className="bg-[#1a1a1a] px-3 py-2 rounded-lg border border-white/5">
                    <HandleInputSection onSave={onHandleSave} compact />
                </div>
            )}
            <SubmissionsList
                submissions={submissions}
                loading={submissionsLoading}
                onViewCode={() => { }}
                contestId={contestId}
                problemIndex={problemId}
            />
        </div>
    );
}
