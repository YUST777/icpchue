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
                {/* Submit/Test buttons moved to ProblemHeader */}
            </div>
        </div>
    );
}
