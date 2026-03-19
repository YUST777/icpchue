'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Download, Check, AlertTriangle } from 'lucide-react';

export default function ExtensionOnboardingModal() {
    const [isOpen, setIsOpen] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const hasSeen = localStorage.getItem('icpchue-extension-onboarding-seen');
        if (hasSeen) return;

        const isInstalled = document.getElementById('verdict-extension-installed');
        if (isInstalled) return;

        const timer = setTimeout(() => setIsOpen(true), 1500);
        return () => clearTimeout(timer);
    }, []);

    const handleVideoEnd = useCallback(() => {
        if (videoRef.current) {
            const duration = videoRef.current.duration;
            if (!duration || duration < 2) {
                videoRef.current.currentTime = 0;
            } else {
                videoRef.current.currentTime = 2;
            }
            videoRef.current.play();
        }
    }, []);

    const handleClose = () => {
        setIsOpen(false);
        localStorage.setItem('icpchue-extension-onboarding-seen', 'true');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <div className="w-full max-w-sm bg-gradient-to-b from-[#0f0f0f] to-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden relative">
                {/* Close Button */}
                <button
                    onClick={handleClose}
                    className="absolute top-3 right-3 z-20 w-7 h-7 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                >
                    <X size={16} />
                </button>

                {/* Compact Video Header */}
                <div className="relative w-full h-24 overflow-hidden">
                    <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        loop
                        onEnded={handleVideoEnd}
                        className="absolute inset-0 w-full h-full object-cover scale-110"
                    >
                        <source src="/videos/huly_laser.webm" type="video/webm" />
                    </video>
                    <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/70 to-black/95" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-transparent to-transparent" />

                    {/* Header Content */}
                    <div className="relative z-10 h-full flex flex-col justify-end p-4 pb-3">
                        <div className="flex items-center gap-1.5 mb-1">
                            <div className="w-0.5 h-3 bg-[#E8C15A] rounded-full" />
                            <span className="text-[10px] font-medium text-[#E8C15A] uppercase tracking-wider">Extension v2.0.0</span>
                        </div>
                        <h2 className="text-lg font-bold text-white">Cookie Mode (Stable)</h2>
                    </div>
                </div>

                {/* Compact Content */}
                <div className="p-4 space-y-3.5">
                    {/* Description */}
                    <p className="text-xs text-white/60 leading-relaxed">
                        The new Cookie-Based extension bypasses Cloudflare reliably. Submit solutions instantly without leaving ICPC HUE.
                    </p>

                    {/* Features - 2x2 Grid */}
                    <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-start gap-2">
                            <div className="w-4 h-4 rounded-full bg-[#E8C15A]/20 flex items-center justify-center shrink-0 mt-0.5">
                                <Check size={11} className="text-[#E8C15A]" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] text-white/80 leading-relaxed">
                                    <span className="font-semibold text-white">Full CF Bypass</span> — Uses your real session cookies to avoid Cloudflare challenges
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-2">
                            <div className="w-4 h-4 rounded-full bg-[#E8C15A]/20 flex items-center justify-center shrink-0 mt-0.5">
                                <Check size={11} className="text-[#E8C15A]" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] text-white/80 leading-relaxed">
                                    <span className="font-semibold text-white">No Tab Popups</span> — Submissions happen entirely in the background
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-2">
                            <div className="w-4 h-4 rounded-full bg-[#E8C15A]/20 flex items-center justify-center shrink-0 mt-0.5">
                                <Check size={11} className="text-[#E8C15A]" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] text-white/80 leading-relaxed">
                                    <span className="font-semibold text-white">Zero Scraping</span> — Uses official API for verdicts where possible
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-2">
                            <div className="w-4 h-4 rounded-full bg-[#E8C15A]/20 flex items-center justify-center shrink-0 mt-0.5">
                                <Check size={11} className="text-[#E8C15A]" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] text-white/80 leading-relaxed">
                                    <span className="font-semibold text-white">Privacy First</span> — Credentials never leave your machine (only sent to your ICPC HUE server)
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Compact Alert */}
                    <div className="flex gap-2 p-2 rounded-lg bg-[#E8C15A]/5 border border-[#E8C15A]/20">
                        <Download size={13} className="text-[#E8C15A] shrink-0 mt-0.5" />
                        <p className="text-[10px] text-white/60 leading-relaxed">
                            <span className="font-semibold text-[#E8C15A]">Install Note:</span> Load the <code className="/extension">extension/</code> folder in <code className="text-white">chrome://extensions</code> during development.
                        </p>
                    </div>

                    {/* Compact Actions */}
                    <div className="space-y-2 pt-1">
                        <button
                            onClick={() => {
                                window.open('chrome://extensions', '_blank');
                                handleClose();
                            }}
                            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-[#E8C15A] hover:bg-[#d4ac4b] text-black font-semibold text-sm rounded-lg transition-all shadow-md shadow-[#E8C15A]/20 hover:shadow-[#E8C15A]/40 active:scale-[0.98]"
                        >
                            <Download size={16} />
                            Load Local Extension
                        </button>
                        <button
                            onClick={handleClose}
                            className="w-full py-2 text-xs text-white/50 hover:text-white/80 font-medium transition-colors"
                        >
                            Continue without extension
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
