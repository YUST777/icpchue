import { CheckCircle2, Play, XCircle, Loader2, GripHorizontal } from 'lucide-react';
import { Editor, OnMount } from '@monaco-editor/react';
import { useEffect, useRef, useState, useCallback } from 'react';
import { SubmissionResult, Example, CFSubmissionStatus } from '../shared/types';
import EditorToolbar from './EditorToolbar';
import { SUPPORTED_LANGUAGES, TEMPLATES, getLanguageById } from './EditorConstants';
import GradiaExportModal from '../GradiaExportModal';
import init, { format } from "@wasm-fmt/clang-format/web";
import { motion, AnimatePresence } from 'framer-motion';

const DEFAULT_PANEL_PERCENT = 45;
const MIN_PANEL_PERCENT = 0;
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
    const [isLangOpen, setIsLangOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);

    const testPanelTab = testPanelActiveTab ?? internalTab;
    const setTestPanelTab = setTestPanelActiveTab ?? setInternalTab;

    const handleLanguageChange = (langId: string) => {
        const currentTemplate = TEMPLATES[language];
        const isModified = code.trim() && (!currentTemplate || code.trim() !== currentTemplate.trim());
        if (isModified) {
            if (!window.confirm('Switching language will replace your current code. Continue?')) {
                setIsLangOpen(false);
                return;
            }
        }
        setLanguage(langId);
        setIsLangOpen(false);
        if (TEMPLATES[langId]) {
            setCode(TEMPLATES[langId]);
        }
    };

    // Initialize formatter on mount and listen for shortcuts
    useEffect(() => {
        init().catch(err => console.error("Formatting module failed to load:", err));

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

    // Sync isTestPanelVisible with panelContentPercent
    useEffect(() => {
        if (isTestPanelVisible && panelContentPercent === 0) {
            setIsAnimating(true);
            setPanelContentPercent(savedHeightRef.current);
            setTimeout(() => setIsAnimating(false), 300);
        }
    }, [isTestPanelVisible]);

    // Keep isTestPanelVisible in sync
    useEffect(() => {
        if (panelContentPercent > 0 && !isTestPanelVisible) {
            setIsTestPanelVisible(true);
        } else if (panelContentPercent === 0 && isTestPanelVisible) {
            setIsTestPanelVisible(false);
        }
    }, [panelContentPercent]);

    // Expand/collapse helpers
    const expandPanel = useCallback((tab?: 'testcase' | 'result' | 'codeforces') => {
        if (tab) setTestPanelTab(tab);
        if (panelContentPercent === 0) {
            setIsAnimating(true);
            setPanelContentPercent(savedHeightRef.current);
            setTimeout(() => setIsAnimating(false), 300);
        }
    }, [panelContentPercent, setTestPanelTab]);

    const collapsePanel = useCallback(() => {
        if (panelContentPercent > 0) {
            savedHeightRef.current = panelContentPercent;
            localStorage.setItem('icpchue-layout-test-height', panelContentPercent.toString());
            setIsAnimating(true);
            setPanelContentPercent(0);
            setTimeout(() => setIsAnimating(false), 300);
        }
    }, [panelContentPercent]);

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

    // Formatting handler
    const handleFormat = useCallback(() => {
        if (!code.trim()) return;
        try {
            // Default to C++ formatting for now, or match language if possible
            const formatted = format(code, "main.cpp", "Chromium");
            if (formatted) {
                setCode(formatted);
            }
        } catch (err) {
            console.error("Failed to format code:", err);
        }
    }, [code, setCode]);

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
    }, []);

    useEffect(() => {
        let animationFrameId: number;

        const handleVerticalMove = (e: MouseEvent | TouchEvent) => {
            if (!isResizingVertical || !editorContainerRef.current) return;
            if (animationFrameId) cancelAnimationFrame(animationFrameId);

            animationFrameId = requestAnimationFrame(() => {
                if (!editorContainerRef.current) return;
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
                const newPercent = ((distFromBottom / totalHeight) * 100) - tabBarFraction;

                if (newPercent <= SNAP_THRESHOLD) {
                    setPanelContentPercent(0);
                } else if (newPercent >= MAX_PANEL_PERCENT) {
                    setPanelContentPercent(MAX_PANEL_PERCENT);
                } else {
                    setPanelContentPercent(newPercent);
                }
            });
        };

        const handleVerticalEnd = () => {
            setIsResizingVertical(false);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';

            if (panelContentPercent > 0) {
                savedHeightRef.current = panelContentPercent;
                localStorage.setItem('icpchue-layout-test-height', panelContentPercent.toString());
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
        };
    }, [isResizingVertical, panelContentPercent]);

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
                            <div className="flex items-center justify-center h-full text-[#666]">
                                Loading Editor...
                            </div>
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
                        <div className="h-full overflow-y-auto px-2.5 md:px-4 py-3 md:py-4 bg-[#1e1e1e] flex flex-col">
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
