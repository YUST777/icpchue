'use client';

import { useState, useEffect } from 'react';
import { Loader2, Play, ChevronDown } from 'lucide-react';
import { SUPPORTED_LANGUAGES, TEMPLATES, getLanguageById } from './EditorConstants';

interface EditorToolbarProps {
    language: string;
    setLanguage: (lang: string) => void;
    code: string;
    setCode: (code: string) => void;
    submitting: boolean;
    onSubmit: () => void;
    onRunTests?: () => void;
    isTestPanelVisible: boolean;
    setIsTestPanelVisible: (visible: boolean) => void;
}

export default function EditorToolbar({
    language,
    setLanguage,
    code,
    setCode,
    submitting,
    onSubmit,
    onRunTests,
    isTestPanelVisible,
    setIsTestPanelVisible,
}: EditorToolbarProps) {
    const [isLangOpen, setIsLangOpen] = useState(false);
    const [isExtensionInstalled, setIsExtensionInstalled] = useState(true);

    useEffect(() => {
        const checkExtension = () => {
            const hasExtension = !!document.getElementById('verdict-extension-installed');
            setIsExtensionInstalled(hasExtension);
        };

        checkExtension();
        const timer = setTimeout(checkExtension, 500);
        return () => clearTimeout(timer);
    }, []);

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

    const handleSubmitClick = () => {
        if (!isExtensionInstalled) {
            alert("The ICPC HUE Helper extension is required to submit code. Please install it from the Extension page.");
            // Open the test panel view to show the bigger warning UI we just built
            setIsTestPanelVisible(true);
            return;
        }
        onSubmit();
    };

    return (
        <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-[#1a1a1a] border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 relative">
                    <span className="text-xs sm:text-sm font-medium text-white hidden xs:inline">Code</span>
                    <div className="relative">
                        <button
                            onClick={() => setIsLangOpen(!isLangOpen)}
                            className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs px-2 sm:px-2 py-1.5 sm:py-0.5 bg-white/10 rounded text-[#A0A0A0] active:text-white transition-colors border border-transparent active:border-white/10 touch-manipulation min-h-[32px]"
                        >
                            <span className="max-w-[60px] sm:max-w-none truncate">{getLanguageById(language)?.name || 'C++'}</span>
                            <ChevronDown size={10} className="sm:w-3 sm:h-3 shrink-0" />
                        </button>
                        {isLangOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsLangOpen(false)} />
                                <div className="absolute top-full left-0 mt-1 w-40 bg-[#252526] border border-white/10 rounded-lg shadow-xl z-50 py-1 max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-500">
                                    {SUPPORTED_LANGUAGES.map(lang => (
                                        <button
                                            key={lang.id}
                                            onClick={() => handleLanguageChange(lang.id)}
                                            className={`w-full text-left px-3 py-2 text-xs hover:bg-white/5 hover:text-white transition-colors ${language === lang.id ? 'text-[#E8C15A] bg-white/5' : 'text-[#A0A0A0]'}`}
                                        >
                                            {lang.name}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <button
                    onClick={() => {
                        if (onRunTests) {
                            onRunTests();
                        } else {
                            setIsTestPanelVisible(!isTestPanelVisible);
                        }
                    }}
                    disabled={submitting}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-medium border transition-colors flex items-center justify-center gap-1.5 sm:gap-2 touch-manipulation min-h-[32px] ${isTestPanelVisible
                        ? 'bg-white/10 text-white border-white/20'
                        : 'text-[#888] border-transparent active:text-white active:bg-white/5'
                        } ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title="Test your code locally with sample test cases"
                >
                    {submitting ? (
                        <Loader2 size={12} className="sm:w-[14px] sm:h-[14px] animate-spin" />
                    ) : (
                        <Play size={12} className="sm:w-[14px] sm:h-[14px]" />
                    )}
                    <span className="hidden xs:inline">{submitting ? 'Testing...' : 'Test Locally'}</span>
                    <span className="xs:hidden">{submitting ? '...' : 'Test'}</span>
                </button>

                <button
                    id="onboarding-submit-btn"
                    onClick={handleSubmitClick}
                    disabled={submitting || !code.trim()}
                    className="px-3 sm:px-4 py-1.5 bg-gradient-to-r from-[#E8C15A] to-[#CFA144] active:from-[#F0D06A] active:to-[#E8C15A] disabled:from-[#333] disabled:to-[#333] disabled:text-[#666] text-black font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs touch-manipulation min-h-[32px]"
                >
                    {submitting ? (
                        <>
                            <Loader2 size={12} className="sm:w-4 sm:h-4 animate-spin" />
                            <span className="hidden xs:inline">Running...</span>
                            <span className="xs:hidden">...</span>
                        </>
                    ) : (
                        <>
                            <img
                                src="https://codeforces.org/s/0/favicon-32x32.png"
                                alt="CF"
                                className="w-3.5 h-3.5 sm:w-4 sm:h-4 object-contain"
                                style={{ imageRendering: 'crisp-edges' }}
                            />
                            <span>Submit</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
