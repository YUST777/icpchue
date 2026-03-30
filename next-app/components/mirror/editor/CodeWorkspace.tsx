import { CheckCircle2, Play, XCircle, Loader2 } from 'lucide-react';
import { Editor, OnMount } from '@monaco-editor/react';
import { useEffect, useRef, useState, useCallback } from 'react';
import { SubmissionResult, Example, CFSubmissionStatus } from '../shared/types';
import EditorToolbar from './EditorToolbar';
import { SUPPORTED_LANGUAGES } from './EditorConstants';
import dynamic from 'next/dynamic';
// Lazy-load clang-format WASM — only loaded when user actually formats
let formatModule: { format: (code: string, filename: string, style: string) => string } | null = null;
async function loadFormatter() {
    if (formatModule) return formatModule;
    const mod = await import("@wasm-fmt/clang-format/web");
    await mod.default(); // init()
    formatModule = { format: mod.format };
    return formatModule;
}

const GradiaExportModal = dynamic(() => import('../GradiaExportModal'), {
    ssr: false,
});

const DEFAULT_PANEL_PERCENT = 45;
const MAX_PANEL_PERCENT = 75;
const SNAP_THRESHOLD = 5;
const PANEL_TAB_BAR_HEIGHT = 42;

interface CodeWorkspaceProps {
    code: string;
    setCode: (code: string) => void;
    submitting: boolean;
    onSubmit: () => void;
    onRunTests?: () => void;
    handleEditorDidMount: OnMount;
    isTestPanelVisible: boolean;
    setIsTestPanelVisible: (visible: boolean) => void;
    testPanelHeight: number;
    setTestPanelHeight: (height: number) => void;
    testCases: Example[];
    result: SubmissionResult | null;
    cfStatus: CFSubmissionStatus | null;
    mobileView: 'problem' | 'code';
    language: string;
    setLanguage: (lang: string) => void;
    contestId?: string;
    problemId?: string;
    testPanelActiveTab?: 'testcase' | 'result' | 'codeforces';
    setTestPanelActiveTab?: (tab: 'testcase' | 'result' | 'codeforces') => void;
    onAddTestCase?: (testCase: Example) => void;
    onDeleteTestCase?: (index: number) => void;
    onUpdateTestCase?: (index: number, testCase: Example) => void;
    sampleTestCasesCount?: number;
    problemTitle?: string;
}

export default function CodeWorkspace({
    code,
    setCode,
    submitting,
    onSubmit,
    onRunTests,
    handleEditorDidMount,
    isTestPanelVisible,
    setIsTestPanelVisible,
    testCases,
    result,
    cfStatus,
    mobileView,
    language,
    setLanguage,
    contestId,
    problemId,
    testPanelActiveTab,
    setTestPanelActiveTab,
    onAddTestCase,
    onDeleteTestCase,
    onUpdateTestCase,
    sampleTestCasesCount,
    problemTitle,
}: Omit<CodeWorkspaceProps, 'testPanelHeight' | 'setTestPanelHeight'>) {
    const editorContainerRef = useRef<HTMLDivElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [isResizingVertical, setIsResizingVertical] = useState(false);
    const [panelContentPercent, setPanelContentPercent] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const savedHeightRef = useRef(DEFAULT_PANEL_PERCENT);
    const [internalTab, setInternalTab] = useState<'testcase' | 'result' | 'codeforces'>('testcase');
    const [selectedTestCase, setSelectedTestCase] = useState(0);

    // Reset selected test case when problem changes
    useEffect(() => {
        setSelectedTestCase(0);
    }, [contestId, problemId]);

    // Clamp selected test case if test cases shrink (e.g., after deleting a custom test)
    useEffect(() => {
        if (testCases.length > 0 && selectedTestCase >= testCases.length) {
            setSelectedTestCase(testCases.length - 1);
        }
    }, [testCases.length, selectedTestCase]);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);

    const testPanelTab = testPanelActiveTab ?? internalTab;
    const setTestPanelTab = setTestPanelActiveTab ?? setInternalTab;

    // Listen for export shortcut
    useEffect(() => {
        const handleToggleExport = () => setIsExportModalOpen(prev => !prev);
        window.addEventListener('verdict:toggle-export', handleToggleExport);
        return () => window.removeEventListener('verdict:toggle-export', handleToggleExport);
    }, []);

    // Load saved height on mount
    useEffect(() => {
        const savedHeight = localStorage.getItem('icpchue-layout-test-height');
        if (savedHeight) {
            const height = parseFloat(savedHeight);
            if (!isNaN(height) && height >= 15 && height <= MAX_PANEL_PERCENT) {
                savedHeightRef.current = height;
            }
        }
    }, []);

    // Sync: when parent sets isTestPanelVisible=true, expand the panel
    useEffect(() => {
        if (isTestPanelVisible && panelContentPercent === 0) {
            setIsAnimating(true);
            setPanelContentPercent(savedHeightRef.current);
            setTimeout(() => setIsAnimating(false), 300);
        } else if (!isTestPanelVisible && panelContentPercent > 0) {
            // Parent wants to close — collapse the panel
            savedHeightRef.current = panelContentPercent;
            localStorage.setItem('icpchue-layout-test-height', panelContentPercent.toString());
            setIsAnimating(true);
            setPanelContentPercent(0);
            setTimeout(() => setIsAnimating(false), 300);
        }
    }, [isTestPanelVisible]); // Only react to parent's intent, not our own state

    // Expand/collapse helpers
    const expandPanel = useCallback((tab?: 'testcase' | 'result' | 'codeforces') => {
        if (tab) setTestPanelTab(tab);
        if (panelContentPercent === 0) {
            setIsAnimating(true);
            setPanelContentPercent(savedHeightRef.current);
            setIsTestPanelVisible(true);
            setTimeout(() => setIsAnimating(false), 300);
        }
    }, [panelContentPercent, setTestPanelTab, setIsTestPanelVisible]);

    const collapsePanel = useCallback(() => {
        if (panelContentPercent > 0) {
            savedHeightRef.current = panelContentPercent;
            localStorage.setItem('icpchue-layout-test-height', panelContentPercent.toString());
            setIsAnimating(true);
            setPanelContentPercent(0);
            setIsTestPanelVisible(false);
            setTimeout(() => setIsAnimating(false), 300);
        }
    }, [panelContentPercent, setIsTestPanelVisible]);

    const togglePanel = useCallback(() => {
        if (panelContentPercent === 0) {
            expandPanel();
        } else {
            collapsePanel();
        }
    }, [panelContentPercent, expandPanel, collapsePanel]);

    // Tab click handler
    const handleTabClick = useCallback((tab: 'testcase' | 'result' | 'codeforces') => {
        if (panelContentPercent === 0) {
            expandPanel(tab);
        } else {
            setTestPanelTab(tab);
        }
    }, [panelContentPercent, expandPanel, setTestPanelTab]);

    // Formatting handler — lazy-loads WASM on first use
    const handleFormat = useCallback(async () => {
        if (!code.trim()) return;
        try {
            const langFileMap: Record<string, string> = {
                c: 'main.c',
                cpp: 'main.cpp',
                java: 'Main.java',
                javascript: 'main.js',
                csharp: 'Main.cs',
            };
            const filename = langFileMap[language];
            if (!filename) return; // clang-format doesn't support this language
            const mod = await loadFormatter();
            const formatted = mod.format(code, filename, "Chromium");
            if (formatted) setCode(formatted);
        } catch (err) {
            console.error("Failed to format code:", err);
        }
    }, [code, setCode, language]);

    // Monaco editor ref
    const editorInstanceRef = useRef<Parameters<OnMount>[0] | null>(null);
    const onEditorMount: OnMount = (editor, monacoEditor) => {
        editorInstanceRef.current = editor;
        handleEditorDidMount(editor, monacoEditor);

        // Scroll to top so content doesnt float in the middle under CSS zoom
        editor.setScrollPosition({ scrollTop: 0, scrollLeft: 0 });
        editor.revealLine(1);
    };

    // Clean up editor ref on unmount
    useEffect(() => {
        return () => { editorInstanceRef.current = null; };
    }, []);

    // Auto-switch to result tab when result arrives
    useEffect(() => {
        if (result && panelContentPercent > 0) {
            setTestPanelTab('result');
        }
    }, [result, panelContentPercent, setTestPanelTab]);

    // --- DRAG RESIZE LOGIC ---
    const handleGripMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (e.cancelable) e.preventDefault();
        setIsResizingVertical(true);
        setIsAnimating(false);
        document.body.style.cursor = 'row-resize';
        document.body.style.userSelect = 'none';
        
        // Add a transparent overlay to prevent Monaco from stealing pointer events
        const overlay = document.createElement('div');
        overlay.id = 'resize-vertical-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:9998;cursor:row-resize;';
        document.body.appendChild(overlay);

        // Create the ghost resizer line
        if (editorContainerRef.current) {
            const ghost = document.createElement('div');
            ghost.id = 'ghost-vertical-resizer';
            
            // Calculate current height percentage for initial ghost position
            const currentHeightPct = panelContentPercent === 0 
                ? (PANEL_TAB_BAR_HEIGHT / editorContainerRef.current.getBoundingClientRect().height) * 100
                : panelContentPercent + (PANEL_TAB_BAR_HEIGHT / editorContainerRef.current.getBoundingClientRect().height) * 100;
                
            ghost.style.cssText = `
                position: absolute;
                left: 0;
                right: 0;
                height: 2px;
                background-color: #E8C15A;
                z-index: 9999;
                transform: translateY(50%);
                bottom: ${currentHeightPct}%;
            `;
            editorContainerRef.current.appendChild(ghost);
        }
    }, [panelContentPercent]);

    useEffect(() => {
        let animationFrameId: number;
        let ghostLine: HTMLDivElement | null = null;
        let finalPercent: number | null = null;

        const handleVerticalMove = (e: MouseEvent | TouchEvent) => {
            if (!isResizingVertical || !editorContainerRef.current) return;
            if (animationFrameId) cancelAnimationFrame(animationFrameId);

            animationFrameId = requestAnimationFrame(() => {
                if (!editorContainerRef.current) return;
                
                if (!ghostLine) {
                    ghostLine = document.getElementById('ghost-vertical-resizer') as HTMLDivElement;
                }
                
                let clientY: number;
                if (typeof TouchEvent !== 'undefined' && e instanceof TouchEvent) {
                    clientY = e.touches[0].clientY;
                } else {
                    clientY = (e as MouseEvent).clientY;
                }

                const containerRect = editorContainerRef.current.getBoundingClientRect();
                const totalHeight = containerRect.height;
                const distFromBottom = containerRect.bottom - clientY;
                const tabBarFraction = (PANEL_TAB_BAR_HEIGHT / totalHeight) * 100;
                let newPercent = ((distFromBottom / totalHeight) * 100) - tabBarFraction;

                if (newPercent <= SNAP_THRESHOLD) {
                    newPercent = 0;
                } else if (newPercent >= MAX_PANEL_PERCENT) {
                    newPercent = MAX_PANEL_PERCENT;
                }
                
                finalPercent = newPercent;
                
                if (ghostLine) {
                    const visualBottom = newPercent === 0 
                        ? tabBarFraction 
                        : newPercent + tabBarFraction;
                    ghostLine.style.bottom = `${visualBottom}%`;
                }
            });
        };

        const handleVerticalEnd = () => {
            setIsResizingVertical(false);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            
            const overlay = document.getElementById('resize-vertical-overlay');
            if (overlay) overlay.remove();
            
            if (ghostLine) {
                ghostLine.remove();
                ghostLine = null;
            } else {
                const existingGhost = document.getElementById('ghost-vertical-resizer');
                if (existingGhost) existingGhost.remove();
            }

            // Apply the state only ONCE at the end of the drag to avoid expensive React reflows
            if (finalPercent !== null) {
                setPanelContentPercent(finalPercent);
                if (finalPercent > 0) {
                    savedHeightRef.current = finalPercent;
                    localStorage.setItem('icpchue-layout-test-height', finalPercent.toString());
                }
                finalPercent = null;
            }

            if (animationFrameId) cancelAnimationFrame(animationFrameId);
        };

        if (isResizingVertical) {
            document.addEventListener('mousemove', handleVerticalMove);
            document.addEventListener('mouseup', handleVerticalEnd);
            document.addEventListener('touchmove', handleVerticalMove, { passive: false });
            document.addEventListener('touchend', handleVerticalEnd);
        }

        return () => {
            document.removeEventListener('mousemove', handleVerticalMove);
            document.removeEventListener('mouseup', handleVerticalEnd);
            document.removeEventListener('touchmove', handleVerticalMove);
            document.removeEventListener('touchend', handleVerticalEnd);
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            const existingGhost = document.getElementById('ghost-vertical-resizer');
            if (existingGhost) existingGhost.remove();
        };
    }, [isResizingVertical]);

    // Double-click grip to toggle
    const handleGripDoubleClick = useCallback(() => {
        togglePanel();
    }, [togglePanel]);

    const isCollapsed = panelContentPercent === 0;

    return (
        <div
            ref={editorContainerRef}
            id="onboarding-code-workspace"
            className={`flex-1 flex flex-col bg-[#1e1e1e] min-w-0 min-h-0 ${mobileView === 'problem' ? 'hidden md:flex' : 'flex'}`}
            style={{
                cursor: isResizingVertical ? 'row-resize' : 'auto',
            }}
        >
            {/* Editor Header */}
            <EditorToolbar
                language={language}
                setLanguage={setLanguage}
                code={code}
                setCode={setCode}
                submitting={submitting}
                onSubmit={onSubmit}
                onRunTests={onRunTests}
                isTestPanelVisible={!isCollapsed}
                setIsTestPanelVisible={(v) => { if (v) expandPanel(); else collapsePanel(); }}
                onExport={() => setIsExportModalOpen(true)}
                exportShortcut={["Alt", "G"]}
                onFormat={handleFormat}
            />

            <div
                ref={wrapperRef}
                className="relative min-h-[120px] flex-1"
            >
                <div className="absolute inset-0">
                    <Editor
                        height="100%"
                        defaultLanguage="cpp"
                        language={SUPPORTED_LANGUAGES.find(l => l.id === language)?.monaco || 'cpp'}
                        theme="vs-dark"
                        value={code}
                        onChange={(value) => {
                            setCode(value || '');
                            // Dispatch for behavior tracking
                            window.dispatchEvent(new Event('icpchue:code-change'));
                        }}
                        onMount={onEditorMount}
                        options={{
                            minimap: { enabled: false },
                            fontSize: 13,
                            fontFamily: "'JetBrains Mono', monospace",
                            scrollBeyondLastLine: false,
                            automaticLayout: true,
                            padding: { top: 0, bottom: 0 },
                            lineHeight: 22,
                            fontLigatures: true,
                            lineNumbers: 'on',
                            renderLineHighlight: 'all',
                            suggest: {
                                filterGraceful: false,
                                matchOnWordStartOnly: true,
                                showWords: true,
                                insertMode: 'replace',
                            },
                            quickSuggestions: {
                                other: true,
                                comments: false,
                                strings: false
                            },
                            contextmenu: false,
                            scrollbar: {
                                vertical: 'visible',
                                horizontal: 'visible',
                                verticalScrollbarSize: 6,
                                horizontalScrollbarSize: 6,
                                useShadows: false,
                                verticalHasArrows: false,
                                horizontalHasArrows: false,
                            },
                        }}
                        loading={
                            <div className="h-full bg-[#1e1e1e]" />
                        }
                    />
                </div>
            </div>

            {/* ============ TEST PANEL (ALWAYS RENDERED) ============ */}
            <div
                id="onboarding-test-panel"
                className="shrink-0 flex flex-col bg-[#1a1a1a]"
                style={{
                    height: isCollapsed 
                        ? `${PANEL_TAB_BAR_HEIGHT}px` 
                        : `calc(${panelContentPercent}% + ${PANEL_TAB_BAR_HEIGHT}px)`,
                    maxHeight: `${MAX_PANEL_PERCENT + 5}%`,
                    transition: isAnimating && !isResizingVertical ? 'height 0.25s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
                }}
            >
                {/* Grip Handle + Tab Bar (always visible) */}
                <div
                    className="shrink-0 select-none"
                    style={{ height: `${PANEL_TAB_BAR_HEIGHT}px` }}
                >
                    {/* Grip pill - draggable area */}
                    <div
                        className="flex items-center justify-center cursor-row-resize group touch-none relative z-10"
                        style={{ height: '20px', marginTop: '-10px' }}
                        onMouseDown={handleGripMouseDown}
                        onTouchStart={handleGripMouseDown}
                        onDoubleClick={handleGripDoubleClick}
                    >
                        <div className="w-10 h-[3px] rounded-full bg-white/15 group-hover:bg-[#E8C15A]/60 group-active:bg-[#E8C15A] transition-colors" />
                    </div>

                    {/* Tab buttons */}
                    <div className="flex items-center px-1 bg-[#1a1a1a]" style={{ height: `${PANEL_TAB_BAR_HEIGHT - 10}px` }}>
                        <button
                            onClick={() => handleTabClick('testcase')}
                            className={`flex items-center gap-2 px-4 h-full text-[13px] font-medium transition-colors relative ${testPanelTab === 'testcase'
                                ? 'text-white'
                                : 'text-[#808080] hover:text-[#b0b0b0]'
                                }`}
                        >
                            <CheckCircle2 size={14} />
                            Testcase
                            {testPanelTab === 'testcase' && (
                                <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-[#E8C15A] rounded-full" />
                            )}
                        </button>
                        <button
                            onClick={() => handleTabClick('result')}
                            className={`flex items-center gap-2 px-4 h-full text-[13px] font-medium transition-colors relative ${testPanelTab === 'result'
                                ? 'text-white'
                                : 'text-[#808080] hover:text-[#b0b0b0]'
                                }`}
                        >
                            <Play size={14} />
                            Test Result
                            {testPanelTab === 'result' && (
                                <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-[#E8C15A] rounded-full" />
                            )}
                        </button>
                        <button
                            onClick={() => handleTabClick('codeforces')}
                            className={`flex items-center gap-2 px-4 h-full text-[13px] font-medium transition-colors relative ${testPanelTab === 'codeforces'
                                ? 'text-white'
                                : 'text-[#808080] hover:text-[#b0b0b0]'
                                }`}
                        >
                            {cfStatus && cfStatus.status !== 'idle' ? (
                                cfStatus.status === 'done' ? (
                                    cfStatus.verdict === 'OK' || cfStatus.verdict === 'Accepted' ? (
                                        <CheckCircle2 size={14} className="text-green-400" />
                                    ) : (
                                        <XCircle size={14} className="text-red-400" />
                                    )
                                ) : cfStatus && cfStatus.status === 'error' ? (
                                    <XCircle size={14} className="text-red-400" />
                                ) : (
                                    <Loader2 size={14} className="animate-spin text-blue-400" />
                                )
                            ) : (
                                <img
                                    src="https://codeforces.org/s/0/favicon-32x32.png"
                                    alt="CF"
                                    className="w-3.5 h-3.5"
                                />
                            )}
                            Codeforces
                            {testPanelTab === 'codeforces' && (
                                <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-[#E8C15A] rounded-full" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Content area */}
                <div
                    className="flex-1 min-h-0 overflow-hidden border-t border-white/[0.06]"
                    style={{
                        opacity: isCollapsed ? 0 : 1,
                        transition: isAnimating ? 'opacity 0.2s ease' : 'none',
                    }}
                >
                    {!isCollapsed && (
                        <div className="h-full overflow-y-auto px-2.5 md:px-4 py-3 md:py-4 bg-[#1a1a1a] flex flex-col">
                            {testPanelTab === 'testcase' && (
                                <TestCaseTabInline
                                    testCases={testCases}
                                    selectedTestCase={selectedTestCase}
                                    setSelectedTestCase={setSelectedTestCase}
                                    result={result}
                                    onAddTestCase={onAddTestCase}
                                    onDeleteTestCase={onDeleteTestCase}
                                    onUpdateTestCase={onUpdateTestCase}
                                    sampleTestCasesCount={sampleTestCasesCount ?? 0}
                                />
                            )}
                            {testPanelTab === 'result' && (
                                <TestResultTabInline result={result} />
                            )}
                            {testPanelTab === 'codeforces' && (
                                <CFStatusTabInline
                                    cfStatus={cfStatus}
                                    contestId={contestId}
                                    problemId={problemId}
                                />
                            )}
                        </div>
                    )}
                </div>
            </div>


            <GradiaExportModal
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
                code={code}
                language={language}
                title={problemTitle || 'My Code'}
            />
        </div>
    );
}

// Import the actual tab components from testrunner/
import TestCaseTabInline from '../testrunner/TestCaseTab';
import TestResultTabInline from '../testrunner/TestResultTab';
import CFStatusTabInline from '../testrunner/CFStatusTab';
