'use client';

import { useState, useEffect } from 'react';
import { X, Download, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallBanner() {
    const [showBanner, setShowBanner] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

    useEffect(() => {
        // Check if already installed or dismissed
        const dismissed = localStorage.getItem('pwa-banner-dismissed');
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

        if (dismissed || isStandalone) return;

        // Detect iOS
        const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        // Use setTimeout to avoid synchronous setState in effect
        setTimeout(() => setIsIOS(iOS), 0);

        // Check if mobile
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        if (!isMobile) return;

        // For Android - listen for install prompt
        const handleBeforeInstall = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setShowBanner(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstall);

        // For iOS - show banner
        if (iOS) {
            setTimeout(() => setShowBanner(true), 2000);
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
        };
    }, []);

    const handleInstall = async () => {
        if (deferredPrompt) {
            await deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setShowBanner(false);
            }
            setDeferredPrompt(null);
        }
    };

    const handleDismiss = () => {
        setShowBanner(false);
        localStorage.setItem('pwa-banner-dismissed', 'true');
    };

    if (!showBanner) return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-[#E8C15A] to-[#CFA144] text-black px-4 py-3 shadow-lg animate-slideDown">
            <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-black/10 rounded-lg">
                        <Download size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm">Install ICPC HUE App</p>
                        <p className="text-xs opacity-80 truncate">
                            {isIOS ? 'Tap Share then "Add to Home Screen"' : 'Get the full app experience'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {isIOS ? (
                        <button
                            onClick={handleDismiss}
                            className="flex items-center gap-1 px-3 py-1.5 bg-black text-[#E8C15A] rounded-lg text-xs font-bold"
                        >
                            <Share size={14} /> Share
                        </button>
                    ) : (
                        <button
                            onClick={handleInstall}
                            className="px-3 py-1.5 bg-black text-[#E8C15A] rounded-lg text-xs font-bold hover:bg-black/80 transition-colors"
                        >
                            Install
                        </button>
                    )}
                    <button
                        onClick={handleDismiss}
                        className="p-1.5 hover:bg-black/10 rounded-full transition-colors"
                        aria-label="Dismiss"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            <style jsx>{`
                @keyframes slideDown {
                    from { transform: translateY(-100%); }
                    to { transform: translateY(0); }
                }
                .animate-slideDown {
                    animation: slideDown 0.3s ease-out;
                }
            `}</style>
        </div>
    );
}
