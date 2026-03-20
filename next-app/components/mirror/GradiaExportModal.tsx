'use client';

import { useRef, useState, useEffect } from 'react';
import { X, Download, Share2, Copy, Check } from 'lucide-react';
import { toPng, toBlob } from 'html-to-image';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface GradiaExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    code: string;
    language: string;
    title?: string;
}

export default function GradiaExportModal({
    isOpen,
    onClose,
    code,
    language,
    title = 'My Code'
}: GradiaExportModalProps) {
    const exportRef = useRef<HTMLDivElement>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    if (!isOpen) return null;

    const handleDownload = async () => {
        if (!exportRef.current) return;
        setIsExporting(true);
        try {
            const dataUrl = await toPng(exportRef.current, {
                quality: 1,
                pixelRatio: 2,
                cacheBust: true,
                skipFonts: true,
            });
            const link = document.createElement('a');
            link.download = `code-snippet-${new Date().getTime()}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error('Failed to export image', err);
        } finally {
            setIsExporting(false);
        }
    };

    const handleCopy = async () => {
        if (!exportRef.current) return;
        try {
            const blob = await toBlob(exportRef.current, {
                quality: 1,
                pixelRatio: 2,
                cacheBust: true,
                skipFonts: true,
            });
            if (!blob) throw new Error('Failed to generate blob');
            await navigator.clipboard.write([
                new ClipboardItem({
                    [blob.type]: blob
                })
            ]);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy image', err);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-8">
            <div className="relative w-full max-w-4xl flex flex-col gap-6">
                {/* Header Controls */}
                <div className="flex items-center justify-between text-white">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Share2 size={20} className="text-[#E8C15A]" />
                        Export Snippet
                        <span className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[9px] font-mono text-white/40 uppercase">Alt + G</span>
                    </h2>
                    <button
                        onClick={onClose}
                        className="flex items-center gap-3 p-2 hover:bg-white/10 rounded-full transition-colors group"
                    >
                        <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Esc</span>
                        <X size={24} />
                    </button>
                </div>

                {/* Export Container (The part that gets captured) */}
                <div
                    ref={exportRef}
                    className="w-full aspect-[16/10] sm:aspect-video rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center p-8 sm:p-20 relative"
                    style={{
                        background: 'radial-gradient(circle at center, #f6d32d 0%, #f5c211 50%, #e5a50a 100%)',
                    }}
                >
                    {/* Logo in top-left */}
                    <div className="absolute top-8 left-10 pointer-events-none opacity-80">
                        <img src="/icons/icpchue.svg" alt="ICPC HUE" className="w-10 h-10 drop-shadow-lg" />
                    </div>

                    {/* Shadow/Glow effect */}
                    <div className="absolute inset-0 bg-black/5 pointer-events-none" />
                    
                    {/* Fake Window */}
                    <div className="w-full max-w-2xl bg-[#1e1e1e] rounded-xl shadow-2xl overflow-hidden border border-white/5 flex flex-col">
                        {/* Title Bar */}
                        <div className="h-10 px-4 flex items-center justify-between border-b border-white/5 bg-[#252526]">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                                <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                                <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
                            </div>
                            <div className="text-[11px] font-medium text-white/50 tracking-wider uppercase">
                                {title}
                            </div>
                            <div className="w-12 h-3" /> {/* Spacer to center title */}
                        </div>
                        
                        {/* Code Area */}
                        <div className="p-4 overflow-hidden">
                            <SyntaxHighlighter
                                language={language}
                                style={vscDarkPlus}
                                customStyle={{
                                    margin: 0,
                                    padding: 0,
                                    background: 'transparent',
                                    fontSize: '14px',
                                    lineHeight: '1.5',
                                    fontFamily: "'JetBrains Mono', monospace",
                                }}
                                showLineNumbers={true}
                                lineNumberStyle={{
                                    minWidth: '2.5em',
                                    paddingRight: '1em',
                                    color: 'rgba(255,255,255,0.2)',
                                    textAlign: 'right',
                                    userSelect: 'none',
                                }}
                            >
                                {code}
                            </SyntaxHighlighter>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-center gap-4">
                    <button
                        onClick={handleCopy}
                        className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all border border-white/10 backdrop-blur-sm"
                    >
                        {isCopied ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
                        {isCopied ? 'Copied!' : 'Copy Image'}
                    </button>
                    <button
                        onClick={handleDownload}
                        disabled={isExporting}
                        className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-[#E8C15A] to-[#CFA144] hover:from-[#CFA15A] hover:to-[#B8913A] text-black font-bold rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50"
                    >
                        {isExporting ? <X size={18} className="animate-spin" /> : <Download size={18} />}
                        {isExporting ? 'Exporting...' : 'Download PNG'}
                    </button>
                </div>
            </div>
        </div>
    );
}
