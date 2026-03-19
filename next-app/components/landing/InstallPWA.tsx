'use client';

import { useState, useEffect } from 'react';
import { Smartphone, X, Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export default function InstallPWA() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showInstallBanner, setShowInstallBanner] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Check if already installed
        if (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches) {
            // Use setTimeout to avoid synchronous setState in effect
            setTimeout(() => setIsInstalled(true), 0);
            return;
        }

        // Listen for the beforeinstallprompt event
        const handleBeforeInstall = (e: Event) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            // Show the install banner
            const hasSeenBanner = localStorage.getItem('pwa-banner-dismissed');
            if (!hasSeenBanner) {
                setShowInstallBanner(true);
            }
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstall);

        // Check if app was installed
        window.addEventListener('appinstalled', () => {
            console.log('✅ PWA installed successfully');
            setIsInstalled(true);
            setShowInstallBanner(false);
            setDeferredPrompt(null);
        });

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) {
            return;
        }

        // Show the install prompt
        deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);

        // Clear the deferredPrompt
        setDeferredPrompt(null);
        setShowInstallBanner(false);
    };

    const handleDismiss = () => {
        setShowInstallBanner(false);
        localStorage.setItem('pwa-banner-dismissed', 'true');
    };

    // Don't show anything if already installed or no prompt available
    if (isInstalled || !deferredPrompt) {
        return null;
    }

    return (
        <>
            {/* Top Banner (Auto-show on first visit) */}
            {showInstallBanner && (
                <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-[#d59928] to-[#c08820] text-black p-3 md:p-4 shadow-lg animate-slide-down">
                    <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Smartphone className="w-5 h-5 md:w-6 md:h-6 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm md:text-base">Install ICPC HUE App</p>
                                <p className="text-xs text-black/80 hidden sm:block">Get quick access from your home screen!</p>
                            </div>
                        </div>
                        <button
                            onClick={handleInstallClick}
                            className="bg-black text-[#d59928] px-4 py-2 rounded-lg font-bold text-sm hover:bg-black/90 transition-colors flex items-center gap-2 whitespace-nowrap"
                        >
                            <Download size={16} />
                            Install
                        </button>
                        <button
                            onClick={handleDismiss}
                            className="p-1 hover:bg-black/10 rounded transition-colors"
                            aria-label="Dismiss"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>
            )}

            {/* Floating Install Button (Always visible if installable) */}
            <button
                onClick={handleInstallClick}
                className="fixed bottom-20 md:bottom-6 right-4 bg-[#d59928] text-black p-3 md:p-4 rounded-full shadow-2xl hover:bg-[#c08820] transition-all hover:scale-110 z-40 group"
                title="Install ICPC HUE App"
            >
                <Smartphone className="w-5 h-5 md:w-6 md:h-6" />
                <span className="absolute right-full mr-3 bg-black text-[#d59928] px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    Install App
                </span>
            </button>

            <style jsx global>{`
                @keyframes slide-down {
                    from {
                        transform: translateY(-100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
                .animate-slide-down {
                    animation: slide-down 0.3s ease-out;
                }
            `}</style>
        </>
    );
}
