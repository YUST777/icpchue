'use client';

import { useState, useEffect } from 'react';
import { Bookmark, Braces, Maximize2, Minimize2, Copy, Check, ChevronUp, Share2 } from 'lucide-react';
import { SUPPORTED_LANGUAGES, getLanguageById } from './EditorConstants';
import { Tooltip } from '@/components/ui/Tooltip';

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
    onSubmit,
    onRunTests,
    isTestPanelVisible,
    setIsTestPanelVisible,
    onExport,
    exportShortcut,
    onFormat,
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

    const [isFullScreen, setIsFullScreen] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const theme = "dark"; // Defaulting to dark

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
        setIsFullScreen(true);
        const element = document.documentElement;
        if (element.requestFullscreen) {
            element.requestFullscreen();
        }
    };

    const handleExitFullScreen = () => {
        setIsFullScreen(false);
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
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
                        onClick={() => setIsLangOpen(!isLangOpen)}
                        className="flex items-center gap-2 outline-none transition-all duration-300 hover:bg-white/5 px-2 py-1 rounded-md cursor-pointer text-[13px] text-white/60 hover:text-white"
                    >
                        {getLanguageById(language)?.name || 'C++'}
                        <ChevronUp className='w-4 rotate-180 opacity-50' />
                    </button>

                    {isLangOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsLangOpen(false)} />
                            <div className="absolute top-full left-0 mt-1 w-44 bg-[#282828] border border-white/10 rounded shadow-2xl z-50 py-1.5 max-h-80 overflow-y-auto">
                                {SUPPORTED_LANGUAGES.map(lang => (
                                    <button
                                        key={lang.id}
                                        onClick={() => handleLanguageChange(lang.id)}
                                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-white/5 hover:text-white transition-colors ${language === lang.id ? 'text-[#E8C15A] bg-white/5' : 'text-[#A0A0A0]'}`}
                                    >
                                        {lang.name}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                <div className="flex gap-4 items-center">
                    <Tooltip content="Bookmark" position="bottom">
                        <Bookmark className='w-4 text-white/40 hover:text-white cursor-pointer transition-colors' />
                    </Tooltip>
                    
                    <Tooltip content={isCopied ? 'Copied!' : 'Copy Code'} position="bottom">
                        {isCopied ? 
                            <Check className='w-4 text-green-500 transition-colors' /> : 
                            <Copy onClick={handleCopyToClipboard} className='w-4 cursor-pointer text-white/40 hover:text-white transition-colors' />
                        }
                    </Tooltip>

                    <Tooltip content="Export as Image" shortcut={exportShortcut} position="bottom">
                        <Share2 onClick={onExport} className='w-4 cursor-pointer text-[#E8C15A]/60 hover:text-[#E8C15A] transition-colors' />
                    </Tooltip>

                    <Tooltip content="Format Code" position="bottom">
                        <Braces onClick={onFormat} className='w-4 cursor-pointer text-[#E8C15A]/60 hover:text-[#E8C15A] transition-colors' />
                    </Tooltip>

                    <Tooltip content={isFullScreen ? 'Exit Full Screen' : 'Full screen'} position="bottom">
                        {isFullScreen ?
                            <Minimize2 onClick={handleExitFullScreen} className='w-4 ml-2 cursor-pointer text-white/40 hover:text-white transition-colors' /> :
                            <Maximize2 onClick={handleFullScreen} className='w-4 ml-2 cursor-pointer text-white/40 hover:text-white transition-colors' />
                        }
                    </Tooltip>
                </div>
            </div>
        </div>
    );
}
