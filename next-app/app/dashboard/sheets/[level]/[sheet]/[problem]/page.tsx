'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { OnMount } from '@monaco-editor/react';
import Link from 'next/link';

// Subfolder components (Verdict structure)
import { ProblemHeader, ProblemLeftPanel, ProblemDrawer } from '@/components/mirror/problem';
import { CodeWorkspace } from '@/components/mirror/editor';
import SubmissionDetailModal from '@/components/mirror/SubmissionDetailModal';
import type { ActiveSheet, SheetProblem } from '@/components/mirror/problem/ProblemDrawer';
import ExtensionGate from '@/components/core/ExtensionGate';
import { TestCasesLoader } from '@/components/common/TestCasesLoader';
import OnboardingTour from '@/components/mirror/OnboardingTour';
import MirrorSkeleton from '@/components/mirror/MirrorSkeleton';

// Hooks
import { useProblemData } from '@/hooks/contest/useProblemData';
import { useCodePersistence } from '@/hooks/contest/useCodePersistence';
import { useCustomTestCases } from '@/hooks/contest/useCustomTestCases';
import { useResizableLayout } from '@/hooks/contest/useResizableLayout';
import { useWhiteboardResize } from '@/hooks/contest/useWhiteboardResize';
import { useCodeforcesSubmission } from '@/hooks/contest/useCodeforcesSubmission';
import { useLocalTestRunner } from '@/hooks/contest/useLocalTestRunner';
import { useCodeforcesHandle } from '@/hooks/contest/useCodeforcesHandle';
import { useWhiteboardStore } from '@/hooks/contest/useWhiteboardStore';
import { fetchWithCache } from '@/lib/api-cache';

import type { CFProblemData, AnalyticsStats } from '@/components/mirror/shared/types';

export default function ProblemPage() {
    const params = useParams();
    const levelSlug = params.level as string;
    const sheetSlug = params.sheet as string;
    const problemLetter = (params.problem as string).toUpperCase();

    const [loading, setLoading] = useState(true);
    const [isNavigating, setIsNavigating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [meta, setMeta] = useState<any>(null);
    const [prefetchedCfData, setPrefetchedCfData] = useState<CFProblemData | null>(null);

    // Fetch BOTH curriculum meta AND codeforces mirror data in one go
    useEffect(() => {
        let cancelled = false;
        
        // If we already have meta, this is a navigation loading, not initial loading
        if (meta) {
            setIsNavigating(true);
        } else {
            setLoading(true);
        }

        const loadAll = async () => {
            try {
                const metaData = await fetchWithCache<any>(`/api/curriculum/problem/${levelSlug}/${sheetSlug}/${problemLetter}`, {}, 300);

                if (!metaData || !metaData.problem) {
                    if (!cancelled) setError('Problem not found in curriculum');
                    return;
                }
                const problem = metaData.problem;
                
                const urlType = problem.groupId ? 'group' : 'contest';
                const mirrorUrl = `/api/codeforces/mirror?contestId=${problem.contestId}&problemId=${problemLetter}&type=${urlType}${problem.groupId ? `&groupId=${problem.groupId}` : ''}`;

                const cfData: CFProblemData = await fetchWithCache<CFProblemData>(mirrorUrl, {}, 300);
                
                if (!cancelled) {
                    setMeta(problem);
                    setPrefetchedCfData(cfData);
                    setError(null);
                }
            } catch (err: any) {
                if (!cancelled) setError(err.message || 'Network error — please refresh');
            } finally {
                if (!cancelled) {
                    setLoading(false);
                    setIsNavigating(false);
                }
            }
        };

        loadAll();
        return () => { cancelled = true; };
    }, [levelSlug, sheetSlug, problemLetter]);

    // Initial loading state (first time entering any problem)
    if (loading && !meta) {
        return (
            <div className="fixed inset-0 bg-[#0B0B0C] flex flex-col items-center justify-center z-50 gap-6">
                <TestCasesLoader />
            </div>
        );
    }

    // Error state (only if we don't have meta yet)
    if (error && !meta) {
        return (
            <div className="min-h-screen bg-[#0B0B0C] flex items-center justify-center p-4">
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-8 text-center max-w-md">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-red-400 mb-2">Problem Not Found</h2>
                    <p className="text-white/60 mb-6">{error || 'This problem is not part of the active curriculum.'}</p>
                    <Link href={`/dashboard/sheets/${levelSlug}/${sheetSlug}`} className="text-[#E8C15A] hover:underline">Return to Sheet</Link>
                </div>
            </div>
        );
    }

    if (!meta || !prefetchedCfData) return null;

    return (
        <>
            <OnboardingTour delay={1500} />
            {isNavigating && (
                <div className="fixed top-0 left-0 right-0 h-0.5 z-[100] bg-[#E8C15A]/20 overflow-hidden">
                    <div className="h-full bg-[#E8C15A] animate-loader-progress shadow-[0_0_10px_#E8C15A]" />
                </div>
            )}
            <MirrorUI
                contestId={meta.contestId}
                groupId={meta.groupId}
                sheetId={meta.sheetId}
                problemId={problemLetter}
                levelSlug={levelSlug}
                sheetSlug={sheetSlug}
                prefetchedCfData={prefetchedCfData}
            />
            <style jsx global>{`
                @keyframes loader-progress {
                    0% { width: 0; transform: translateX(-100%); }
                    50% { width: 70%; transform: translateX(0); }
                    100% { width: 100%; transform: translateX(100%); }
                }
                .animate-loader-progress {
                    animation: loader-progress 2s infinite ease-in-out;
                }
            `}</style>
        </>
    );
}

function MirrorUI({
    contestId, groupId, sheetId, problemId, levelSlug, sheetSlug, prefetchedCfData
}: {
    contestId: string;
    groupId?: string;
    sheetId: string;
    problemId: string;
    levelSlug: string;
    sheetSlug: string;
    prefetchedCfData: CFProblemData;
}) {
    const urlType = groupId ? 'group' : 'contest';

    // Problem Data Hook
    const { problem, cfData, loading, error, cfStats, sampleTestCases } = useProblemData({
        contestId,
        problemId,
        urlType,
        groupId,
        initialCfData: prefetchedCfData,
        sheetId
    });

    // Code Persistence Hook
    const { code, setCode, language, setLanguage } = useCodePersistence({ contestId, problemId });

    // Custom Test Cases Hook
    const sampleTestCasesCount = sampleTestCases.length;
    const { customTestCases, handleAdd: handleAddTestCase, handleDelete: handleDeleteTestCase, handleUpdate: handleUpdateTestCase } = useCustomTestCases({
        contestId,
        problemId,
        sampleTestCasesCount
    });

    // Combined test cases
    const testCases = [...sampleTestCases, ...customTestCases];

    // Layout Hooks
    const { containerRef, leftPanelRef, handleMouseDown, lastWidth } = useResizableLayout();
    const { whiteboardHeight, handleResizeStart: handleWhiteboardResizeStart } = useWhiteboardResize();

    // Codeforces Handle
    const { handle: cfHandle, setHandle: setCfHandle, loading: handleLoading } = useCodeforcesHandle();

    // ─── Tab & UI State ───
    const [activeTab, setActiveTab] = useState<'description' | 'submissions' | 'analytics' | 'solution'>('description');
    const [showNotes, setShowNotes] = useState(false);
    const isWhiteboardExpanded = useWhiteboardStore(state => state.isExpanded);
    const toggleExpanded = useWhiteboardStore(state => state.toggleExpanded);
    const handleSetWhiteboardExpanded = useCallback((expanded: boolean) => {
        if (expanded !== isWhiteboardExpanded) toggleExpanded();
    }, [isWhiteboardExpanded, toggleExpanded]);
    const [mobileView, setMobileView] = useState<'problem' | 'code'>('problem');
    const [isTestPanelVisible, setIsTestPanelVisible] = useState(true);
    const [testPanelActiveTab, setTestPanelActiveTab] = useState<'testcase' | 'result' | 'codeforces'>('testcase');

    // ─── ProblemDrawer State ───
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [activeSheet, setActiveSheet] = useState<ActiveSheet | null>(null);
    const sheetProblems = activeSheet?.problems ?? [];

    // ─── Analytics Stats ───
    const [stats, setStats] = useState<AnalyticsStats | null>(null);
    const [statsLoading, setStatsLoading] = useState(false);

    // ─── Submissions ───
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [submissionsLoading, setSubmissionsLoading] = useState(false);
    const [selectedSubId, setSelectedSubId] = useState<number | null>(null);

    const abortControllerRef = useRef<AbortController | null>(null);

    // Fetch submissions
    const fetchSubmissions = useCallback(async () => {
        if (!problemId) return;

        // Abort previous request if still flying
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        
        const controller = new AbortController();
        abortControllerRef.current = controller;

        setSubmissionsLoading(true);
        try {
            const params = new URLSearchParams();
            if (sheetId) params.set('sheetId', sheetId);
            params.set('problemId', problemId);
            if (contestId) params.set('contestId', contestId);

            // Pass the signal to fetchWithCache. (fetchWithCache must support it under the hood, or we just pass it to standard fetch)
            // But fetchWithCache in api-cache.ts might not take signal. We can just use standard fetch or rely on api-cache to ignore it. 
            // We'll standard fetch since we need cancellation, or modify fetchWithCache. 
            // Assuming fetchWithCache doesn't take signal, we'll gracefully handle state updates if aborted.
            const data = await fetchWithCache<any>(`/api/submissions?${params}`, {}, 30);
            
            if (controller.signal.aborted) return;

            if (data && data.success) {
                setSubmissions(data.submissions);
            }
        } catch (err: any) {
            if (controller.signal.aborted) return;
            console.error('Failed to fetch submissions:', err);
        } finally {
            if (!controller.signal.aborted) {
                setSubmissionsLoading(false);
            }
            if (abortControllerRef.current === controller) {
                abortControllerRef.current = null;
            }
        }
    }, [sheetId, problemId, contestId]);

    // Fetch submissions when tab switches or on mount (background prefetch)
    useEffect(() => {
        if (activeTab === 'submissions' || activeTab === 'analytics') {
            fetchSubmissions();
        }
    }, [activeTab, fetchSubmissions]);

    // Background prefetch: load submissions when cfHandle is available
    useEffect(() => {
        if (cfHandle && !submissionsLoading && submissions.length === 0) {
            fetchSubmissions();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cfHandle]);

    // ─── State Reset on Navigation ───
    useEffect(() => {
        setActiveTab('description');
        setIsTestPanelVisible(false);
        setTestPanelActiveTab('testcase');
        setSubmissions([]);
        setStats(null);
    }, [contestId, problemId]);

    const { cfStatus, handleSubmit, submitting: cfSubmitting } = useCodeforcesSubmission({
        code,
        language,
        contestId,
        problemId,
        urlType,
        groupId,
        codeforcesUrl: problem?.codeforcesUrl,
        setIsTestPanelVisible,
        setTestPanelActiveTab,
        sheetId
    });

    // Auto-refresh submissions when a new one is done
    useEffect(() => {
        if (cfStatus?.status === 'done') {
            fetchSubmissions();
        }
    }, [cfStatus?.status, fetchSubmissions]);

    const { result, runTests, submitting: testSubmitting } = useLocalTestRunner({
        code,
        language,
        testCases,
        timeLimit: cfData?.meta.timeLimitMs || 2000,
        memoryLimit: cfData?.meta.memoryLimitMB || 256,
        setIsTestPanelVisible,
        contestId,
        problemId
    });

    const submitting = cfSubmitting || testSubmitting;
    const editorRef = useRef<any>(null);
    const handleEditorDidMount: OnMount = (editor) => {
        editorRef.current = editor;
    };

    const router = useRouter();
    const navigationBaseUrl = `/dashboard/sheets/${levelSlug}/${sheetSlug}`;

    // ─── Global Keyboard Shortcuts ───
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            // 1. Run Tests: Ctrl + '
            if (e.ctrlKey && e.key === "'") {
                e.preventDefault();
                if (!submitting) runTests();
            }
            // 2. Submit: Ctrl + Enter
            else if (e.ctrlKey && e.key === "Enter") {
                e.preventDefault();
                if (!submitting && code.trim()) handleSubmit();
            }
            // 3. Close Tab (Back): Alt + W
            else if (e.altKey && e.key.toLowerCase() === "w") {
                e.preventDefault();
                router.push(navigationBaseUrl);
            }
            // 4. Maximize / Exit Maximize Panel: Alt + +
            else if (e.altKey && (e.key === "+" || e.key === "=")) {
                e.preventDefault();
                setIsTestPanelVisible(!isTestPanelVisible);
            }
            // 5. Full Screen: Alt + F
            else if (e.altKey && e.key.toLowerCase() === "f") {
                e.preventDefault();
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(err => {
                        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
                    });
                } else {
                    document.exitFullscreen();
                }
            }
            // 6. Settings: Alt + S
            else if (e.altKey && e.key.toLowerCase() === "s") {
                e.preventDefault();
                // We'll use a custom event or a store to trigger this
                window.dispatchEvent(new CustomEvent('verdict:toggle-settings'));
            }
            // 7. Notes: Alt + N
            else if (e.altKey && e.key.toLowerCase() === "n") {
                e.preventDefault();
                setShowNotes(prev => !prev);
            }
            // 8. Problem List: Alt + P
            else if (e.altKey && e.key.toLowerCase() === "p") {
                e.preventDefault();
                setIsDrawerOpen(prev => !prev);
            }
            // 9. Export Snippet: Alt + G
            else if (e.altKey && e.key.toLowerCase() === "g") {
                e.preventDefault();
                window.dispatchEvent(new CustomEvent('verdict:toggle-export'));
            }
        };

        window.addEventListener("keydown", handleGlobalKeyDown);
        return () => window.removeEventListener("keydown", handleGlobalKeyDown);
    }, [submitting, code, runTests, handleSubmit, navigationBaseUrl, router, isTestPanelVisible]);

    // Fallback loading
    if (loading || !problem || !cfData) {
        return <MirrorSkeleton />;
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#0B0B0C] flex items-center justify-center p-4">
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-8 text-center max-w-md">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-red-400 mb-2">Mirror Failed</h2>
                    <p className="text-white/60 mb-6">{error || 'Problem not found'}</p>
                    <Link href={navigationBaseUrl} className="text-[#E8C15A] hover:underline">Return to Sheet</Link>
                </div>
            </div>
        );
    }

    // ─── Stable callbacks for memoized children ───
    const noopAnalyze = useCallback(() => {}, []);
    const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
    const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);
    const closeModal = useCallback(() => setSelectedSubId(null), []);
    const restoreCode = useCallback((newCode: string) => setCode(newCode), [setCode]);

    return (
        <ExtensionGate>
            <div className="mirror-ui fixed inset-0 bg-[#0B0B0C] text-[#DCDCDC] z-50 flex flex-col" style={{ zoom: 0.85 }}>
                {/* ProblemDrawer — slides from left */}
                <ProblemDrawer
                    isOpen={isDrawerOpen}
                    onClose={closeDrawer}
                    currentContestId={contestId}
                    currentProblemId={problemId}
                    urlType={urlType}
                    groupId={groupId}
                    onSheetLoaded={setActiveSheet}
                    sheet={activeSheet}
                    sheetId={sheetId}
                    levelSlug={levelSlug}
                    sheetSlug={sheetSlug}
                />

                <ProblemHeader
                    sheetId={sheetSlug}
                    problem={cfData}
                    mobileView={mobileView}
                    setMobileView={setMobileView}
                    navigationBaseUrl={navigationBaseUrl}
                    problemId={problemId}
                    onToggleSidebar={openDrawer}
                    onOpenDrawer={openDrawer}
                    sheetProblems={sheetProblems}
                    onSubmit={handleSubmit}
                    onRunTests={runTests}
                    submitting={submitting}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    showNotes={showNotes}
                    setShowNotes={setShowNotes}
                />

                <div ref={containerRef} className="flex-1 flex overflow-hidden">
                    <ProblemLeftPanel
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        isWhiteboardExpanded={isWhiteboardExpanded}
                        setIsWhiteboardExpanded={handleSetWhiteboardExpanded}
                        cfData={cfData}
                        submissions={submissions}
                        submissionsLoading={submissionsLoading}
                        statsLoading={statsLoading}
                        stats={stats}
                        cfStats={cfStats}
                        contestId={contestId}
                        problemId={problemId}
                        whiteboardHeight={whiteboardHeight}
                        handleWhiteboardResizeStart={handleWhiteboardResizeStart}
                        analyzeComplexity={noopAnalyze}
                        complexityLoading={false}
                        leftPanelRef={leftPanelRef}
                        lastWidth={lastWidth}
                        mobileView={mobileView}
                        cfHandle={cfHandle}
                        handleLoading={handleLoading}
                        onHandleSave={setCfHandle}
                        onViewCode={setSelectedSubId}
                        sheetSlug={sheetSlug}
                        levelSlug={levelSlug}
                        urlType={urlType}
                        groupId={groupId}
                        showNotes={showNotes}
                        setShowNotes={setShowNotes}
                    />

                    {/* Panel Resizer */}
                    <div
                        className="hidden md:block w-1 bg-white/5 hover:bg-[#E8C15A]/50 cursor-col-resize transition-colors relative group shrink-0"
                        onMouseDown={handleMouseDown}
                    >
                        <div className="absolute inset-y-0 -left-1 -right-1" />
                    </div>

                    <CodeWorkspace
                        code={code}
                        setCode={setCode}
                        submitting={submitting}
                        onSubmit={handleSubmit}
                        onRunTests={runTests}
                        handleEditorDidMount={handleEditorDidMount}
                        isTestPanelVisible={isTestPanelVisible}
                        setIsTestPanelVisible={setIsTestPanelVisible}
                        testCases={testCases}
                        result={result}
                        cfStatus={cfStatus}
                        mobileView={mobileView}
                        language={language}
                        setLanguage={setLanguage}
                        contestId={contestId}
                        problemId={problemId}
                        testPanelActiveTab={testPanelActiveTab}
                        setTestPanelActiveTab={setTestPanelActiveTab}
                        onAddTestCase={handleAddTestCase}
                        onDeleteTestCase={handleDeleteTestCase}
                        onUpdateTestCase={handleUpdateTestCase}
                        sampleTestCasesCount={sampleTestCasesCount}
                        problemTitle={cfData.meta.title}
                    />
                </div>

                {/* Submission Detail Modal */}
                <SubmissionDetailModal
                    isOpen={selectedSubId !== null}
                    onClose={closeModal}
                    submissionId={selectedSubId}
                    contestId={contestId}
                    onRestoreCode={restoreCode}
                />
            </div>
        </ExtensionGate>
    );
}
