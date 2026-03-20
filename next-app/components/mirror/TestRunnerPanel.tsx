import {
    CheckCircle2,
    XCircle,
    Play,
    Minimize2,
    Loader2
} from 'lucide-react';
import { SubmissionResult, Example, CFSubmissionStatus } from './types';
import TestCaseTab from './testrunner/TestCaseTab';
import TestResultTab from './testrunner/TestResultTab';
import CFStatusTab from './testrunner/CFStatusTab';

interface TestRunnerPanelProps {
    height: string;
    activeTab: 'testcase' | 'result' | 'codeforces';
    setActiveTab: (tab: 'testcase' | 'result' | 'codeforces') => void;
    selectedTestCase: number;
    setSelectedTestCase: (index: number) => void;
    testCases: Example[];
    result: SubmissionResult | null;
    cfStatus: CFSubmissionStatus | null;
    onClose: () => void;
    onResizeStart: (e: React.MouseEvent | React.TouchEvent) => void;
    contestId?: string;
    problemId?: string;
    // Custom test cases
    onAddTestCase?: (testCase: Example) => void;
    onDeleteTestCase?: (index: number) => void;
    onUpdateTestCase?: (index: number, testCase: Example) => void;
    sampleTestCasesCount?: number;
}

export default function TestRunnerPanel({
    height,
    activeTab,
    setActiveTab,
    selectedTestCase,
    setSelectedTestCase,
    testCases,
    result,
    cfStatus,
    onClose,
    onResizeStart,
    contestId,
    problemId,
    onAddTestCase,
    onDeleteTestCase,
    onUpdateTestCase,
    sampleTestCasesCount = 0
}: TestRunnerPanelProps) {
    return (
        <>
            {/* Vertical Resizer Bar */}
            <div
                className="h-2 bg-[#1a1a1a] hover:bg-[#E8C15A]/50 cursor-row-resize transition-colors relative group shrink-0 border-y border-white/5 active:bg-[#E8C15A]/50 touch-none z-10"
                onMouseDown={onResizeStart}
                onTouchStart={onResizeStart}
                style={{ marginTop: '-10px', height: '20px' }}
            >
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 bg-[#1a1a1a] group-hover:bg-[#E8C15A]/30 transition-colors" />
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-1 bg-white/20 rounded-full group-hover:bg-[#E8C15A]/50 transition-colors" />
            </div>

            {/* Test Case Panel Content */}
            <div
                id="onboarding-test-panel"
                className="bg-[#1a1a1a] flex flex-col min-h-0 shrink-0"
                style={{ height }}
            >
                {/* Headers */}
                <div className="flex items-center justify-between border-b border-white/10 shrink-0 px-1 md:px-2 bg-[#252526]">
                    <div className="flex items-center overflow-x-auto scrollbar-hide">
                        <button
                            onClick={() => setActiveTab('testcase')}
                            className={`flex items-center gap-1.5 md:gap-2 px-2.5 md:px-4 py-2 text-[10px] md:text-xs font-medium transition-colors border-t-2 border-transparent whitespace-nowrap shrink-0 ${activeTab === 'testcase'
                                ? 'text-white border-t-[#E8C15A] bg-[#1e1e1e]'
                                : 'text-[#666] hover:text-[#A0A0A0]'
                                }`}
                        >
                            <CheckCircle2 size={12} />
                            <span className="hidden sm:inline">Testcase</span>
                            <span className="sm:hidden">Tests</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('result')}
                            className={`flex items-center gap-1.5 md:gap-2 px-2.5 md:px-4 py-2 text-[10px] md:text-xs font-medium transition-colors border-t-2 border-transparent whitespace-nowrap shrink-0 ${activeTab === 'result'
                                ? 'text-white border-t-[#E8C15A] bg-[#1e1e1e]'
                                : 'text-[#666] hover:text-[#A0A0A0]'
                                }`}
                        >
                            <Play size={12} />
                            <span className="hidden sm:inline">Test Result</span>
                            <span className="sm:hidden">Result</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('codeforces')}
                            className={`flex items-center gap-1.5 md:gap-2 px-2.5 md:px-4 py-2 text-[10px] md:text-xs font-medium transition-colors border-t-2 border-transparent whitespace-nowrap shrink-0 ${activeTab === 'codeforces'
                                ? 'text-white border-t-[#E8C15A] bg-[#1e1e1e]'
                                : 'text-[#666] hover:text-[#A0A0A0]'
                                }`}
                        >
                            {cfStatus && cfStatus.status !== 'idle' ? (
                                cfStatus.status === 'done' ? (
                                    cfStatus.verdict === 'OK' || cfStatus.verdict === 'Accepted' ? (
                                        <CheckCircle2 size={12} className="text-green-400" />
                                    ) : (
                                        <XCircle size={12} className="text-red-400" />
                                    )
                                ) : cfStatus && cfStatus.status === 'error' ? (
                                    <XCircle size={12} className="text-red-400" />
                                ) : (
                                    <Loader2 size={12} className="animate-spin text-blue-400" />
                                )
                            ) : (
                                <img
                                    src="https://codeforces.org/s/0/favicon-32x32.png"
                                    alt="CF"
                                    className="w-3 h-3"
                                />
                            )}
                            <span className="hidden sm:inline">Codeforces</span>
                            <span className="sm:hidden">CF</span>
                        </button>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-[#666] hover:text-white transition-colors shrink-0"
                    >
                        <Minimize2 size={14} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-2.5 md:px-4 py-3 md:py-4 bg-[#2d2d2d] flex flex-col">
                    {activeTab === 'testcase' ? (
                        <TestCaseTab
                            testCases={testCases}
                            selectedTestCase={selectedTestCase}
                            setSelectedTestCase={setSelectedTestCase}
                            result={result}
                            onAddTestCase={onAddTestCase}
                            onDeleteTestCase={onDeleteTestCase}
                            onUpdateTestCase={onUpdateTestCase}
                            sampleTestCasesCount={sampleTestCasesCount}
                        />
                    ) : activeTab === 'result' ? (
                        <TestResultTab result={result} />
                    ) : (
                        <CFStatusTab
                            cfStatus={cfStatus}
                            contestId={contestId}
                            problemId={problemId}
                        />
                    )}
                </div>
            </div>
        </>
    );
}
