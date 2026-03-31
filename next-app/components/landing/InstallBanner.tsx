'use client';

import { useState, useEffect } from 'react';
import { X, Download, Share } from 'lucide-react';
import { usePathname } from 'next/navigation';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallBanner() {
    const [showBanner, setShowBanner] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const pathname = usePathname();

    // Don't show on the mirror/problem page — it covers the editor
    const isEditorPage = pathname?.includes('/sheets/') && pathname?.split('/').length > 5;

    useEffect(() => {
        const dismissed = localStorage.getItem('pwa-banner-dismissed');
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
        if (dismissed || isStandalone) return;

        const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        setIsIOS(iOS);

        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (!isMobile) return;

        const handleBeforeInstall = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setShowBanner(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstall);

        if (iOS) {
            const timer = setTimeout(() => setShowBanner(true), 3000);
            return () => { clearTimeout(timer); window.removeEventListener('beforeinstallprompt', handleBeforeInstall); };
        }

        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    }, []);

    const handleInstall = async () => {
        if (deferredPrompt) {
            await deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') setShowBanner(false);
            setDeferredPrompt(null);
        }
    };

    const handleDismiss = () => {
        setShowBanner(false);
        localStorage.setItem('pwa-banner-dismissed', 'true');
    };

    if (!showBanner || isEditorPage) return null;

    return (
        <div
            className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-[env(safe-area-inset-bottom,8px)] pointer-events-none"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }}
        >
            <div className="pointer-events-auto max-w-md mx-auto bg-[#1a1a1a] border border-white/10 rounded-2xl p-3 shadow-[0_-4px_30px_rgba(0,0,0,0.5)] flex items-center gap-3 animate-slideUp mb-2">
                {/* Icon */}
                <div className="w-10 h-10 rounded-xl bg-[#E8C15A]/10 border border-[#E8C15A]/20 flex items-center justify-center shrink-0">
                    <img src="/icons/icon-192.png" alt="" className="w-6 h-6 rounded" />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">Install ICPC HUE</p>
                    <p className="text-[11px] text-white/50 truncate">
                        {isIOS ? 'Tap Share → Add to Home Screen' : 'Add to your home screen'}
                    </p>
                </div>

                {/* Actions */}
                {isIOS ? (
                    <button
                        onClick={handleDismiss}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-[#E8C15A] text-black rounded-xl text-xs font-bold active:scale-95 transition-transform"
                    >
                        <Share size={13} />
                        Got it
                    </button>
                ) : (
                    <button
                        onClick={handleInstall}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-[#E8C15A] text-black rounded-xl text-xs font-bold active:scale-95 transition-transform"
                    >
                        <Download size={13} />
                        Install
                    </button>
                )}

                {/* Close */}
                <button
                    onClick={handleDismiss}
                    className="shrink-0 p-1.5 text-white/30 hover:text-white/60 active:scale-90 transition-all rounded-lg"
                    aria-label="Dismiss install banner"
                >
                    <X size={16} />
                </button>
            </div>

            <style jsx>{`
                @keyframes slideUp {
                    from { transform: translateY(100%); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .animate-slideUp {
                    animation: slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1);
                }
            `}</style>
        </div>
    );
}
