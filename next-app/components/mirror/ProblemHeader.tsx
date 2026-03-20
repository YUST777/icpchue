import { Problem } from './types';
import {
    HeaderLogo,
    NavigationBlock,
    HeaderActions,
    MobileViewToggle,
    useNavigationIds,
} from './header';

interface ProblemHeaderProps {
    sheetId: string;
    problem: Problem | null;
    mobileView: 'problem' | 'code';
    setMobileView: (view: 'problem' | 'code') => void;
    navigationBaseUrl: string;
}

export default function ProblemHeader({
    problem,
    mobileView,
    setMobileView,
    navigationBaseUrl,
}: ProblemHeaderProps) {
    const problemId = problem?.id || '';
    const { prevId, nextId } = useNavigationIds({ problemId });

    return (
        <div className="sticky top-0 z-10 w-full shrink-0 flex flex-col bg-[#121212] border-b border-white/10 transition-all duration-200">
            {/* Top Bar */}
            <div className="h-12 sm:h-14 flex items-center justify-between px-3 sm:px-4 w-full min-h-[48px]">
                <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                    <HeaderLogo navigationBaseUrl={navigationBaseUrl} />
                    <div className="h-6 w-px bg-white/10 mx-3 hidden sm:block shrink-0" />
                    <NavigationBlock
                        navigationBaseUrl={navigationBaseUrl}
                        prevId={prevId}
                        nextId={nextId}
                    />
                </div>

                {/* Right Side: Actions (Desktop) */}
                <HeaderActions />
            </div>

            {/* Mobile View Toggle (Row 2) */}
            <MobileViewToggle
                mobileView={mobileView}
                setMobileView={setMobileView}
                variant="tabs"
            />
        </div>
    );
}
