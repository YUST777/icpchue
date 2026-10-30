'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { X, ArrowRight, Flame, Trophy, GraduationCap, Code2, LayoutList } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const ACHIEVEMENTS_UPDATE_STORAGE_KEY = 'seen_achievements_v3_update';

const CATEGORIES = [
    { name: 'Daily Streaks', icon: Flame, count: '×8' },
    { name: 'Monthly Podium', icon: Trophy, count: '×5' },
    { name: 'Level 0', icon: GraduationCap, count: '×10' },
    { name: 'Codeforces', icon: Code2, count: '×10' },
    { name: 'Board', icon: LayoutList, count: '×15' },
];

export default function AchievementsUpdateModal({ forceOpen = false }: { forceOpen?: boolean } = {}) {
    const pathname = usePathname();
    const isDashboard = forceOpen || (pathname?.startsWith('/dashboard') ?? false);

    const [mounted, setMounted] = useState(false);
    const [isOpen, setIsOpen] = useState(forceOpen);
    const [isMobile, setIsMobile] = useState(false);
    const [countdown, setCountdown] = useState(5);
    const videoRef = useRef<HTMLVideoElement>(null);
    const dragControls = useDragControls();

    // Initial client mount check
    useEffect(() => {
        setMounted(true);
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);

        if (forceOpen) {
            setIsOpen(true);
            return () => window.removeEventListener('resize', checkMobile);
        }

        // Only auto-open if currently on /dashboard
        if (!isDashboard) {
            return () => window.removeEventListener('resize', checkMobile);
        }

        try {
            const seen = localStorage.getItem(ACHIEVEMENTS_UPDATE_STORAGE_KEY);
            if (!seen) {
                const timer = setTimeout(() => {
                    setIsOpen(true);
                }, 700);
                return () => {
                    clearTimeout(timer);
                    window.removeEventListener('resize', checkMobile);
                };
            }
        } catch {
            // fallback
        }

        return () => window.removeEventListener('resize', checkMobile);
    }, [isDashboard, forceOpen]);

    // 5-second countdown timer for the close button
    useEffect(() => {
        if (!isOpen) {
            setCountdown(5);
            return;
        }

        setCountdown(5);
        const interval = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [isOpen]);

    // Listen for manual open trigger (e.g. from Notifications dropdown)
    useEffect(() => {
        const handleOpenTrigger = () => {
            setIsOpen(true);
        };
        window.addEventListener('open-achievements-update-log', handleOpenTrigger);
        return () => window.removeEventListener('open-achievements-update-log', handleOpenTrigger);
    }, []);

    // Body scroll lock & Escape key listener
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && countdown === 0) {
                handleClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = originalOverflow;
        };
    }, [isOpen, countdown]);

    const handleClose = useCallback(() => {
        if (videoRef.current) {
            videoRef.current.pause();
        }
        setIsOpen(false);
        try {
            localStorage.setItem(ACHIEVEMENTS_UPDATE_STORAGE_KEY, 'true');
            window.dispatchEvent(new Event('achievements-update-seen'));
        } catch {
            // Ignore storage errors in private browsing
        }
    }, []);

    // Never render outside /dashboard (unless forceOpen in preview)
    if (!mounted || !isDashboard) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[2147483640] flex items-end md:items-center justify-center p-0 md:p-6 overflow-hidden">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        onClick={countdown === 0 ? handleClose : undefined}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                    />

                    {/* Modal / Slider Card */}
                    {isMobile ? (
                        /* Mobile: Bottom-to-Top Slider with drag-down-to-close */
                        <motion.div
                            key="mobile-slider"
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                            drag={countdown === 0 ? 'y' : false}
                            dragControls={dragControls}
                            dragConstraints={{ top: 0, bottom: 0 }}
                            dragElastic={{ top: 0.05, bottom: 0.7 }}
                            onDragEnd={(_, info) => {
                                if (countdown === 0 && (info.offset.y > 60 || info.velocity.y > 200)) {
                                    handleClose();
                                }
                            }}
                            style={{ zIndex: 10000 }}
                            className="relative w-full max-h-[92dvh] bg-[#111113] border-t border-white/10 rounded-t-3xl shadow-[0_-20px_50px_rgba(0,0,0,0.8)] flex flex-col touch-pan-y overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Drag handle area */}
                            <div
                                onPointerDown={(e) => {
                                    if (countdown === 0) dragControls.start(e);
                                }}
                                className={`w-full pt-3 pb-2 flex flex-col items-center select-none ${
                                    countdown === 0 ? 'cursor-grab active:cursor-grabbing touch-none' : ''
                                }`}
                            >
                                <div className="w-12 h-1 rounded-full bg-white/25 hover:bg-white/40 transition-colors" />
                            </div>

                            {/* Header */}
                            <div className="px-5 pb-3 flex items-center justify-between border-b border-white/[0.08]">
                                <h2 className="text-base font-bold text-white tracking-tight">
                                    Dev Log: 48 New Achievements
                                </h2>
                                <button
                                    type="button"
                                    disabled={countdown > 0}
                                    onClick={countdown === 0 ? handleClose : undefined}
                                    aria-label={countdown > 0 ? `Wait ${countdown}s to close` : 'Close'}
                                    className={`min-w-[34px] h-8 px-2 flex items-center justify-center rounded-lg border transition-all ${
                                        countdown > 0
                                            ? 'bg-white/5 border-white/10 text-white/40 font-mono text-xs cursor-not-allowed select-none'
                                            : 'bg-white/5 hover:bg-white/10 border-white/15 text-white/70 hover:text-white cursor-pointer active:scale-95'
                                    }`}
                                >
                                    {countdown > 0 ? <span>{countdown}s</span> : <X size={18} />}
                                </button>
                            </div>

                            {/* Scrollable Content */}
                            <div className="overflow-y-auto px-5 py-4 space-y-4 flex-1">
                                {/* Video Player */}
                                <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black border border-white/10 shadow-lg">
                                    <video
                                        ref={videoRef}
                                        src="/videos/achievements_1080p.mp4"
                                        poster="/videos/achievements_poster.webp"
                                        controls
                                        autoPlay
                                        muted
                                        playsInline
                                        preload="metadata"
                                        className="w-full h-full object-contain"
                                    />
                                </div>

                                {/* Dev Log Categories */}
                                <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3.5 space-y-2.5">
                                    <div className="text-xs font-semibold text-white/90">
                                        Added: 48 New Achievements in 5 categories:
                                    </div>
                                    <div className="flex flex-col space-y-1.5">
                                        {CATEGORIES.map(({ name, icon: Icon, count }) => (
                                            <div
                                                key={name}
                                                className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]"
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-6 h-6 rounded-md bg-[#E8C15A]/10 border border-[#E8C15A]/25 flex items-center justify-center text-[#E8C15A] shrink-0">
                                                        <Icon size={13} />
                                                    </div>
                                                    <span className="text-xs font-medium text-white/90">{name}</span>
                                                </div>
                                                <span className="text-[11px] font-mono font-semibold text-[#E8C15A] bg-[#E8C15A]/10 border border-[#E8C15A]/25 px-2 py-0.5 rounded-full">
                                                    {count}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Action Button */}
                                <div className="pt-1 pb-6">
                                    <Link
                                        href="/dashboard/achievements"
                                        onClick={handleClose}
                                        className="w-full h-11 rounded-xl bg-[#E8C15A] hover:bg-[#d8b046] active:scale-[0.99] text-black font-bold text-sm flex items-center justify-center gap-2 shadow-[0_2px_12px_rgba(232,193,90,0.3)] transition-all"
                                    >
                                        <span>Explore Badges</span>
                                        <ArrowRight size={16} />
                                    </Link>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        /* Desktop: Centered 2-Column Balanced Modal */
                        <motion.div
                            key="desktop-modal"
                            initial={{ opacity: 0, scale: 0.95, y: 12 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 12 }}
                            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                            style={{ zIndex: 10000 }}
                            className="relative w-full max-w-4xl bg-[#111113] border border-white/10 rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-gradient-to-r from-white/[0.02] to-transparent">
                                <div className="flex items-center gap-2.5">
                                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#E8C15A] font-bold bg-[#E8C15A]/10 px-2 py-0.5 rounded border border-[#E8C15A]/25">
                                        Dev Log
                                    </span>
                                    <h2 className="text-base font-bold text-white tracking-tight">
                                        48 New Achievements System
                                    </h2>
                                </div>
                                <button
                                    type="button"
                                    disabled={countdown > 0}
                                    onClick={countdown === 0 ? handleClose : undefined}
                                    title={countdown > 0 ? `Wait ${countdown}s` : 'Close (Esc)'}
                                    aria-label={countdown > 0 ? `Wait ${countdown}s to close` : 'Close'}
                                    className={`min-w-[34px] h-8 px-2 flex items-center justify-center rounded-lg border transition-all ${
                                        countdown > 0
                                            ? 'bg-white/5 border-white/10 text-white/40 font-mono text-xs cursor-not-allowed select-none'
                                            : 'bg-white/5 hover:bg-white/10 border-white/15 text-white/70 hover:text-white cursor-pointer active:scale-95'
                                    }`}
                                >
                                    {countdown > 0 ? <span>{countdown}s</span> : <X size={18} />}
                                </button>
                            </div>

                            {/* 2-Column Content Grid */}
                            <div className="grid grid-cols-12 p-6 gap-6 items-stretch">
                                {/* Left: Video Player */}
                                <div className="col-span-7 flex flex-col justify-center">
                                    <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black border border-white/10 shadow-2xl">
                                        <video
                                            ref={videoRef}
                                            src="/videos/achievements_1080p.mp4"
                                            poster="/videos/achievements_poster.webp"
                                            controls
                                            autoPlay
                                            muted
                                            playsInline
                                            preload="metadata"
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                </div>

                                {/* Right: Dev Log Notes & CTA */}
                                <div className="col-span-5 flex flex-col justify-between">
                                    <div className="space-y-3">
                                        <div className="text-xs font-semibold text-white/90">
                                            Added: 48 New Achievements in 5 categories:
                                        </div>
                                        <div className="flex flex-col space-y-2">
                                            {CATEGORIES.map(({ name, icon: Icon, count }) => (
                                                <div
                                                    key={name}
                                                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.025] border border-white/[0.06] hover:border-[#E8C15A]/30 hover:bg-white/[0.04] transition-all"
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-6 h-6 rounded-lg bg-[#E8C15A]/10 border border-[#E8C15A]/25 flex items-center justify-center text-[#E8C15A] shrink-0">
                                                            <Icon size={13} />
                                                        </div>
                                                        <span className="text-xs font-medium text-white/90">{name}</span>
                                                    </div>
                                                    <span className="text-[11px] font-mono font-semibold text-[#E8C15A] bg-[#E8C15A]/10 border border-[#E8C15A]/25 px-2 py-0.5 rounded-full">
                                                        {count}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Action Button */}
                                    <div className="pt-4">
                                        <Link
                                            href="/dashboard/achievements"
                                            onClick={handleClose}
                                            className="w-full h-11 bg-[#E8C15A] hover:bg-[#d8b046] active:scale-[0.99] text-black font-bold text-xs rounded-xl shadow-[0_2px_12px_rgba(232,193,90,0.25)] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                                        >
                                            <span>Explore Badges</span>
                                            <ArrowRight size={14} />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
}
