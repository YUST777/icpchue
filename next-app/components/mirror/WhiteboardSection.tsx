import { useWhiteboardStore } from '@/hooks/contest/useWhiteboardStore';
import Whiteboard from './Whiteboard';

interface WhiteboardSectionProps {
    contestId: string;
    problemId: string;
    onResizeStart: (e: React.MouseEvent | React.TouchEvent) => void;
}

export default function WhiteboardSection({
    contestId,
    problemId,
    onResizeStart
}: WhiteboardSectionProps) {
    const { isExpanded, toggleExpanded } = useWhiteboardStore();
    return (
        <div className="flex flex-col shrink-0 relative z-50">
            {isExpanded && (
                <div
                    className="h-1.5 bg-[#121212] hover:bg-[#E8C15A] cursor-row-resize transition-colors w-full shrink-0"
                    onMouseDown={onResizeStart}
                    onTouchStart={onResizeStart}
                />
            )}
            <Whiteboard
                contestId={contestId}
                problemIndex={problemId}
            />
        </div>
    );
}
