'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Bookmark, Braces, Maximize2, Minimize2, Copy, Check, ChevronUp, Share2, Play, CloudUpload, Loader2 } from 'lucide-react';
import { SUPPORTED_LANGUAGES, getLanguageById } from './EditorConstants';
import { Tooltip } from '@/components/ui/Tooltip';

interface EditorToolbarProps {
    language: string;
    setLanguage: (lang: string) => void;
    code: string;
    setCode: (code: string) => void;
    submitting: boolean;
    isRunningTests?: boolean;
    isSubmittingCF?: boolean;
    onSubmit: () => void;
    onRunTests?: () => void;
    isTestPanelVisible: boolean;
    setIsTestPanelVisible: (visible: boolean) => void;
    onExport?: () => void;
    exportShortcut?: string[];
    onFormat?: () => void;
}



export default function EditorToolbar({
    language,
    setLanguage,
    code,
    setCode,
    submitting,
    isRunningTests,
    isSubmittingCF,
    onSubmit,
    onRunTests,
    isTestPanelVisible,
    setIsTestPanelVisible,
    onExport,
    exportShortcut,
    onFormat,
}: EditorToolbarProps) {
    const [isLangOpen, setIsLangOpen] = useState(false);
    const langButtonRef = useRef<HTMLButtonElement>(null);
    // The menu lives on <body> so the editor's own layers can never draw over it.
    const langRect = isLangOpen ? langButtonRef.current?.getBoundingClientRect() : undefined;
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

    const [isFullScreen, setIsFullScreen] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    // Sync fullscreen state with actual browser fullscreen
    useEffect(() => {
        const handler = () => setIsFullScreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handler);
        return () => document.removeEventListener('fullscreenchange', handler);
    }, []);

    const handleLanguageChange = (langId: string) => {
        // useCodePersistence.handleSetLanguage handles loading saved code / template
        setLanguage(langId);
        setIsLangOpen(false);
    };

    const handleCopyToClipboard = () => {
        navigator.clipboard.writeText(code);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const handleFullScreen = () => {
        document.documentElement.requestFullscreen?.();
    };

    const handleExitFullScreen = () => {
        document.exitFullscreen?.();
    };

    const handleSubmitClick = () => {
        if (!isExtensionInstalled) {
            alert("The ICPC HUE Helper extension is required to submit code. Please install it from the Extension page.");
            setIsTestPanelVisible(true);
            return;
        }
        onSubmit();
    };

    return (
        <div className="flex flex-col bg-[#1a1a1a] border-b border-white/10 shrink-0 select-none header relative z-[50] overflow-visible">
            {/* Row: Language and Actions */}
            <div className={`w-full h-10 px-3 flex items-center justify-between text-neutral-400 bg-[#1a1a1a] overflow-visible`}>
                <div className="relative">
                    <button
                        ref={langButtonRef}
                        onClick={() => setIsLangOpen(!isLangOpen)}
                        className="flex items-center gap-2 outline-none transition-all duration-300 hover:bg-white/5 px-2 py-1 rounded-md cursor-pointer text-[13px] text-white/60 hover:text-white"
                    >
                        {getLanguageById(language)?.name || 'C++'}
                        <ChevronUp className='w-4 rotate-180 opacity-50' />
                    </button>

                    {isLangOpen && langRect && createPortal(
                        <>
                            <div className="fixed inset-0" style={{ zIndex: 2147482999 }} onClick={() => setIsLangOpen(false)} />
                            <div className="ui-compact fixed w-44 bg-[#282828] border border-white/10 rounded shadow-2xl py-1.5 max-h-80 overflow-y-auto"
                                style={{ zIndex: 2147483000, top: langRect.bottom + 4, left: langRect.left, backgroundColor: '#282828' }}>
                                {SUPPORTED_LANGUAGES.map(lang => (
                                    <button
                                        key={lang.id}
                                        onClick={() => handleLanguageChange(lang.id)}
                                        className={`w-full text-left px-3 py-1.5 text-xs leading-5 hover:bg-white/5 hover:text-white transition-colors ${language === lang.id ? 'text-[#E8C15A] bg-white/5' : 'text-[#A0A0A0]'}`}
                                    >
                                        {lang.name}
                                    </button>
                                ))}
                            </div>
                        </>,
                        document.body
                    )}
                </div>

                <div className="flex gap-2 sm:gap-3 md:gap-4 items-center">
                    <span className="hidden md:inline-flex">
                    <Tooltip content="Bookmark" position="bottom">
                        <Bookmark className='w-4 text-white/40 hover:text-white cursor-pointer transition-colors' />
                    </Tooltip>
                    </span>
                    
                    <Tooltip content={isCopied ? 'Copied!' : 'Copy Code'} position="bottom">
                        {isCopied ? 
                            <Check className='w-4 text-green-500 transition-colors' /> : 
                            <Copy onClick={handleCopyToClipboard} className='w-4 cursor-pointer text-white/40 hover:text-white transition-colors' />
                        }
                    </Tooltip>

                    <span className="hidden md:inline-flex">
                    <Tooltip content="Export as Image" shortcut={exportShortcut} position="bottom">
                        <Share2 onClick={onExport} className='w-4 cursor-pointer text-[#E8C15A]/60 hover:text-[#E8C15A] transition-colors' />
                    </Tooltip>
                    </span>

                    <Tooltip content="Format Code" position="bottom">
                        <Braces onClick={onFormat} className='w-4 cursor-pointer text-[#E8C15A]/60 hover:text-[#E8C15A] transition-colors' />
                    </Tooltip>

                    <span className="hidden md:inline-flex">
                    <Tooltip content={isFullScreen ? 'Exit Full Screen' : 'Full screen'} position="bottom">
                        {isFullScreen ?
                            <Minimize2 onClick={handleExitFullScreen} className='w-4 ml-2 cursor-pointer text-white/40 hover:text-white transition-colors' /> :
                            <Maximize2 onClick={handleFullScreen} className='w-4 ml-2 cursor-pointer text-white/40 hover:text-white transition-colors' />
                        }
                    </Tooltip>
                    </span>

                    {/* Phones: the header has no room for Run / Submit, so they live here. */}
                    <div className="flex md:hidden items-center gap-1.5 ml-1">
                        {onRunTests && (
                            <button
                                type="button"
                                onClick={onRunTests}
                                disabled={submitting}
                                aria-label="Run tests"
                                className={`h-8 px-2 sm:px-3 flex items-center gap-1.5 rounded-lg border text-xs font-semibold transition-all ${
                                    isRunningTests
                                        ? 'bg-[#E8C15A]/15 border-[#E8C15A]/40 text-[#E8C15A]'
                                        : 'bg-white/[0.06] border-white/10 text-white/80 active:bg-white/10 disabled:opacity-50'
                                }`}
                            >
                                {isRunningTests ? (
                                    <Loader2 size={12} className="animate-spin text-[#E8C15A]" />
                                ) : (
                                    <Play size={12} fill="currentColor" />
                                )}
                                {isRunningTests ? 'Judging...' : 'Run'}
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleSubmitClick}
                            disabled={submitting}
                            aria-label="Submit to Codeforces"
                            className={`h-8 px-2.5 sm:px-3 flex items-center gap-1.5 rounded-lg text-xs font-bold transition-all ${
                                isSubmittingCF
                                    ? 'bg-[#E8C15A]/80 text-black cursor-wait'
                                    : 'bg-[#E8C15A] text-black active:bg-[#F0D06A] disabled:opacity-50'
                            }`}
                        >
                            {isSubmittingCF ? (
                                <Loader2 size={13} className="animate-spin text-black" />
                            ) : (
                                <CloudUpload size={13} />
                            )}
                            {isSubmittingCF ? 'Submitting...' : 'Submit'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
