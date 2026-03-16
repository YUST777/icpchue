'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Link2, ChevronLeft, Code, Zap } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';

export default function PublicRecapPage() {
    const params = useParams();
    const studentId = params.id as string;

    const [data, setData] = useState<{
        username: string;
        totalSolved: number;
        totalSubmissions: number;
        rankPercentile: number;
        topProblem: string;
        topTags?: Array<{ tag: string; count: number }>;
        difficultySolved?: { easy: number; medium: number; hard: number };
        achievements?: Array<{ id: string; title: string; image: string }>;
        timeSpentMinutes?: number;
        maxStreak: number;
        daysActive: number;
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentSlide, setCurrentSlide] = useState(0);
    const [direction, setDirection] = useState(0);

    useEffect(() => {
        if (!studentId) return;
        fetch(`/api/recap/${studentId}`)
            .then(res => {
                if (!res.ok) {
                    if (res.status === 404) throw new Error('User not found');
                    throw new Error(`Failed to load stats (${res.status})`);
                }
                return res.json();
            })
            .then(d => { setData(d); setLoading(false); })
            .catch(err => { setError(err.message); setLoading(false); });
    }, [studentId]);

    const totalSlides = 5;
    const nextSlide = () => { if (currentSlide < totalSlides - 1) { setDirection(1); setCurrentSlide(c => c + 1); } };
    const prevSlide = () => { if (currentSlide > 0) { setDirection(-1); setCurrentSlide(c => c - 1); } };
    const goToSlide = (idx: number) => { if (idx !== currentSlide) { setDirection(idx > currentSlide ? 1 : -1); setCurrentSlide(idx); } };

    if (loading) {
        return (
            <div className="min-h-screen min-h-[100dvh] bg-black flex items-center justify-center">
                <div className="w-12 h-12 md:w-16 md:h-16 border-4 border-[#E8C15A]/30 border-t-[#E8C15A] rounded-full animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen min-h-[100dvh] bg-black flex flex-col items-center justify-center p-4 text-center">
                <h1 className="text-xl md:text-2xl font-bold text-white mb-2">Oops!</h1>
                <p className="text-white/60 text-sm md:text-base mb-6">{error}</p>
                <Link href="/" className="px-5 py-2 md:px-6 md:py-2.5 bg-[#E8C15A] text-black font-bold rounded-lg hover:bg-[#D4AF37] text-sm md:text-base">
                    Go Home
                </Link>
            </div>
        );
    }

    if (!data) return null;

    // Shared Header
    const Header = () => (
        <div className="flex items-center justify-between px-4 md:px-6 pt-3 md:pt-4 pb-1 md:pb-2">
            <Image src="/icpchue-logo.webp" alt="ICPC HUE" width={24} height={24} className="w-6 h-6 md:w-7 md:h-7 object-contain" />
            <span className="text-white/90 text-xs md:text-sm font-medium italic">Rewind 2025</span>
        </div>
    );

    // Slide 1: Intro (Welcome)
    const IntroSlide = () => (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black overflow-hidden intro-slide">
            {/* Dynamic background effects - Gold Theme */}
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,_#E8C15A25_0%,_transparent_50%)]" />
            <div className="absolute bottom-0 right-0 w-3/4 h-3/4 bg-[radial-gradient(circle_at_100%_100%,_#D4AF3715_0%,_transparent_50%)]" />
            <div className="absolute -left-20 top-1/3 w-64 h-64 bg-[#E8C15A]/5 rounded-full blur-[100px]" />

            {/* Header - Z-30 to be clickable above nav */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-30">
                <Link href="/" className="text-white/80 hover:text-white transition-colors">
                    <ChevronLeft className="w-6 h-6" />
                </Link>
                <div className="flex items-center gap-2">
                    <Image src="/icpchue-logo.webp" alt="ICPC HUE" width={20} height={20} className="w-5 h-5 object-contain" />
                    <span className="text-[#E8C15A] font-bold text-sm tracking-wider">REWIND</span>
                </div>
            </div>

            <div className="relative z-10 w-full px-8 flex flex-col h-full justify-center text-center">
                {/* 2025 Logic */}
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                >
                    <h1 className="text-[100px] md:text-[140px] font-black text-transparent bg-clip-text bg-gradient-to-b from-[#E8C15A] to-[#B89830] leading-none tracking-tighter drop-shadow-[0_0_25px_rgba(232,193,90,0.3)]">
                        2025
                    </h1>
                </motion.div>

                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.8 }}
                >
                    <h2 className="text-3xl md:text-5xl font-black text-white leading-tight mb-6">
                        ICPC HUE<br />
                        <span className="text-[#E8C15A] font-serif italic font-light">Rewind</span>
                    </h2>

                    <div className="w-16 h-1 bg-gradient-to-r from-transparent via-[#E8C15A] to-transparent mx-auto mb-8 rounded-full opacity-50" />

                    <p className="text-lg md:text-xl font-medium text-white/60 max-w-md mx-auto leading-relaxed">
                        Your coding journey,<br />
                        <span className="text-white">celebrated.</span>
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.5, duration: 1 }}
                    className="absolute bottom-24 left-0 right-0 text-white/40 text-xs md:text-sm animate-pulse tracking-widest uppercase"
                >
                    Tap to start
                </motion.div>
            </div>
        </div>
    );

    // Slide 2: Stats
    const StatsSlide = () => (
        <div className="absolute inset-0 flex flex-col bg-gradient-to-b from-[#0a0a0a] to-[#111]">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#E8C15A10_0%,_transparent_60%)]" />
            <div className="relative z-10 flex flex-col h-full">
                <Header />
                <div className="flex-1 flex flex-col justify-center px-4 md:px-6 pb-16 md:pb-20">
                    <p className="text-white/75 text-sm md:text-lg mb-1">You solved</p>
                    <h2 className="text-3xl md:text-5xl lg:text-6xl font-black text-white mb-1">
                        <span className="text-[#E8C15A]">{data.totalSolved}</span> problems
                    </h2>
                    <p className="text-white/50 text-xs md:text-sm mb-4 md:mb-6">
                        {data.totalSolved} ACs in {data.totalSubmissions} submissions.
                    </p>
                    <div className="grid grid-cols-2 gap-2 md:gap-3 mb-4 md:mb-6">
                        <div className="bg-white/5 rounded-xl p-3 md:p-4 border border-white/10">
                            <div className="flex items-center gap-1.5 md:gap-2 mb-1">
                                <Code size={12} className="md:w-4 md:h-4 text-[#E8C15A]" />
                                <span className="text-white/60 text-[10px] md:text-xs">Solved</span>
                            </div>
                            <div className="text-lg md:text-2xl font-bold text-white">{data.totalSolved}</div>
                        </div>
                        <div className="bg-white/5 rounded-xl p-3 md:p-4 border border-white/10">
                            <div className="flex items-center gap-1.5 md:gap-2 mb-1">
                                <Zap size={12} className="md:w-4 md:h-4 text-blue-400" />
                                <span className="text-white/60 text-[10px] md:text-xs">Submissions</span>
                            </div>
                            <div className="text-lg md:text-2xl font-bold text-white">{data.totalSubmissions}</div>
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="text-4xl md:text-6xl lg:text-7xl font-black text-white">{Math.max(0, 100 - data.rankPercentile)}%</div>
                        <div className="text-white/50 text-xs md:text-sm">Above other coders</div>
                    </div>
                </div>
            </div>
        </div>
    );

    // Slide 3: Top Problem
    const TopProblemSlide = () => (
        <div className="absolute inset-0 flex flex-col bg-gradient-to-b from-[#0d0d0d] to-[#0a0a0a]">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#E8C15A08_0%,_transparent_70%)]" />
            <div className="relative z-10 flex flex-col h-full">
                <Header />
                <div className="flex-1 flex flex-col justify-center px-4 md:px-6 pb-16 md:pb-20">
                    <p className="text-white/60 text-[10px] md:text-xs uppercase tracking-widest mb-1 md:mb-2">Most Attempted Question</p>
                    <h2 className="text-lg md:text-2xl lg:text-3xl font-bold text-white mb-4 md:mb-6">{data.topProblem}</h2>

                    <p className="text-white/60 text-[10px] md:text-xs uppercase tracking-widest mb-2">Your Top Skills</p>
                    <div className="flex flex-wrap gap-1.5 md:gap-2 mb-3 md:mb-4">
                        {data.topTags && data.topTags.length > 0 ? (
                            data.topTags.slice(0, 4).map((item: { tag: string; count: number }, i: number) => (
                                <span key={i} className="px-2 py-0.5 md:px-3 md:py-1 bg-[#E8C15A]/15 text-[#E8C15A] text-[9px] md:text-xs rounded border border-[#E8C15A]/25 capitalize">
                                    {item.tag.replace(/-/g, ' ')}
                                </span>
                            ))
                        ) : (
                            <span className="px-2 py-1 bg-white/10 text-white/60 text-xs rounded border border-white/10">
                                Start solving to unlock!
                            </span>
                        )}
                    </div>

                    <p className="text-white/60 text-[10px] md:text-xs uppercase tracking-widest mb-2">Difficulty Breakdown</p>
                    <div className="flex gap-2 md:gap-3 mb-4 md:mb-5">
                        <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-green-500"></span>
                            <span className="text-white/80 text-[10px] md:text-xs">{data.difficultySolved?.easy || 0} Easy</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-yellow-500"></span>
                            <span className="text-white/80 text-[10px] md:text-xs">{data.difficultySolved?.medium || 0} Medium</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-red-500"></span>
                            <span className="text-white/80 text-[10px] md:text-xs">{data.difficultySolved?.hard || 0} Hard</span>
                        </div>
                    </div>

                    {/* Achievements Section */}
                    <p className="text-white/60 text-[10px] md:text-xs uppercase tracking-widest mb-2">Your Achievements</p>
                    <div className="flex gap-2 md:gap-3">
                        {data.achievements && data.achievements.length > 0 ? (
                            data.achievements.map((ach: { id: string; title: string; image: string }, i: number) => (
                                <div key={i} className="relative group">
                                    <div className="w-10 h-10 md:w-14 md:h-14 rounded-lg bg-[#1a1a1a] border border-[#E8C15A]/30 overflow-hidden shadow-[0_0_10px_rgba(232,193,90,0.2)]">
                                        <Image src={ach.image} alt={ach.title} width={56} height={56} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-black/80 px-1.5 py-0.5 rounded text-[8px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                        {ach.title}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <span className="text-white/40 text-xs">No achievements yet!</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    // Slide 4: Stats Recap (Time Spent & Streak)
    const StreakSlide = () => {
        const hours = Math.floor((data.timeSpentMinutes || 0) / 60);
        const minutes = (data.timeSpentMinutes || 0) % 60;

        return (
            <div className="absolute inset-0 flex flex-col bg-[#050505]">
                {/* Background Gradients */}
                <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] bg-[radial-gradient(circle_at_50%_50%,_#E8C15A08_0%,_transparent_60%)] pointer-events-none" />

                <div className="relative z-10 flex flex-col h-full">
                    <Header />

                    <div className="flex-1 flex flex-col justify-center px-4 md:px-6 gap-6 md:gap-10 pb-10">
                        {/* Time Spent Section */}
                        <div className="flex flex-col">
                            <p className="text-[#888] text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase mb-1 md:mb-2 pl-1">
                                Time spent on ICPC HUE
                            </p>
                            <h2 className="text-5xl md:text-7xl leading-[0.9] font-black text-[#E8C15A] tracking-tighter drop-shadow-sm">
                                {hours}h {minutes}m
                            </h2>
                        </div>

                        {/* Longest Streak Section */}
                        <div className="flex flex-col">
                            <p className="text-[#888] text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase mb-2 md:mb-3 pl-1">
                                Your longest coding streak
                            </p>
                            <div className="flex items-baseline gap-2 pl-1">
                                <span className="text-4xl md:text-6xl font-bold text-white leading-none tracking-tighter">{data.maxStreak}</span>
                                <span className="text-lg md:text-2xl text-[#666] font-medium">active days</span>
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-3 gap-3 mt-2">
                            <div className="bg-white/5 border border-white/5 rounded-xl p-3 md:p-4 flex flex-col items-center justify-center text-center">
                                <span className="text-[#888] text-[10px] uppercase tracking-wider font-semibold mb-0.5">Challenges</span>
                                <span className="text-xl md:text-2xl font-bold text-white">{data.totalSolved}</span>
                            </div>
                            <div className="bg-white/5 border border-white/5 rounded-xl p-3 md:p-4 flex flex-col items-center justify-center text-center">
                                <span className="text-[#888] text-[10px] uppercase tracking-wider font-semibold mb-0.5">Streak</span>
                                <span className="text-xl md:text-2xl font-bold text-white">{data.maxStreak}</span>
                            </div>
                            <div className="bg-white/5 border border-white/5 rounded-xl p-3 md:p-4 flex flex-col items-center justify-center text-center">
                                <span className="text-[#888] text-[10px] uppercase tracking-wider font-semibold mb-0.5">Days</span>
                                <span className="text-xl md:text-2xl font-bold text-white">{data.daysActive}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Slide 5: Summary
    const SummarySlide = () => (
        <div className="absolute inset-0 flex flex-col bg-gradient-to-b from-[#1a1510] via-[#0a0a0a] to-[#0a0808]">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#E8C15A20_0%,_transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_#D4AF3715_0%,_transparent_50%)]" />
            <div className="relative z-10 flex flex-col h-full">
                <Header />
                <div className="flex-1 flex flex-col items-center justify-center px-4 md:px-6 pb-16 md:pb-20">
                    <div className="w-14 h-14 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-[#E8C15A] to-[#B89830] flex items-center justify-center text-xl md:text-3xl font-bold text-black mb-2">
                        {data.username[0].toUpperCase()}
                    </div>
                    <h2 className="text-base md:text-xl font-bold text-white mb-1">{data.username}</h2>
                    <div className="flex gap-2 md:gap-3 text-[10px] md:text-sm text-white/60 mb-3 md:mb-4">
                        <span><strong className="text-white">{data.totalSolved}</strong> AC</span>
                        <span><strong className="text-white">{data.totalSubmissions}</strong> Subs</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 md:gap-2 w-full max-w-[280px] md:max-w-xs mb-3 md:mb-4">
                        {[
                            { label: 'Solved', value: data.totalSolved, color: 'text-[#E8C15A]' },
                            { label: 'Streak', value: data.maxStreak, color: 'text-[#D4AF37]' },
                            { label: 'Top', value: `${Math.max(0, 100 - data.rankPercentile)}%`, color: 'text-[#F0D878]' }
                        ].map((item, i) => (
                            <div key={i} className="bg-white/5 rounded-lg p-2 md:p-3 text-center border border-white/10">
                                <div className={`text-[9px] md:text-xs ${item.color} mb-0.5`}>{item.label}</div>
                                <div className="text-sm md:text-lg font-bold text-white">{item.value}</div>
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 md:px-4 md:py-3 w-full max-w-[280px] md:max-w-xs">
                        <div className="w-7 h-7 md:w-10 md:h-10 bg-gradient-to-br from-[#E8C15A] to-[#B89830] rounded-lg flex items-center justify-center text-black text-[9px] md:text-xs font-bold shrink-0">
                            &apos;25
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-white font-semibold text-xs md:text-sm truncate">Rewind 2025</div>
                            <div className="text-white/50 text-[9px] md:text-xs">Your Top Moments</div>
                        </div>
                        <Share2 size={12} className="md:w-4 md:h-4 text-white/50 shrink-0" />
                    </div>
                </div>
            </div>
        </div>
    );

    const slides = [IntroSlide, StatsSlide, TopProblemSlide, StreakSlide, SummarySlide];
    const CurrentSlide = slides[currentSlide];

    return (
        <div className="min-h-screen min-h-[100dvh] bg-black flex items-center justify-center">
            {/* Container - fills screen on mobile, fixed max-width on desktop */}
            <div className="relative w-full max-w-full md:max-w-[500px] h-[100dvh] md:h-[627px] bg-black overflow-hidden md:rounded-2xl md:shadow-2xl">

                {/* Slide Content */}
                <AnimatePresence initial={false} custom={direction} mode="wait">
                    <motion.div
                        key={currentSlide}
                        custom={direction}
                        initial={{ x: direction > 0 ? '100%' : '-100%', opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: direction > 0 ? '-100%' : '100%', opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="absolute inset-0"
                    >
                        <CurrentSlide />
                    </motion.div>
                </AnimatePresence>

                {/* Progress Bars */}
                <div className="absolute bottom-14 left-4 right-4 flex gap-1 z-40">
                    {Array.from({ length: totalSlides }).map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => goToSlide(idx)}
                            className="h-5 flex-1 flex items-center cursor-pointer group"
                        >
                            <div className="h-[3px] md:h-1 w-full bg-white/25 rounded-full overflow-hidden group-hover:bg-white/35 transition-colors">
                                <motion.div
                                    className="h-full bg-white rounded-full"
                                    initial={{ width: '0%' }}
                                    animate={{ width: idx <= currentSlide ? '100%' : '0%' }}
                                    transition={{ duration: 0.3 }}
                                />
                            </div>
                        </button>
                    ))}
                </div>

                {/* Bottom Buttons */}
                <div className="absolute bottom-2 md:bottom-4 left-3 right-3 md:left-5 md:right-5 flex items-center justify-between z-30">
                    <button
                        onClick={prevSlide}
                        disabled={currentSlide === 0}
                        className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/15 disabled:opacity-30 transition-all"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                    </button>
                    <div className="flex gap-2">
                        {/* Copy Link Button */}
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(window.location.href);
                                // Simple feedback could be a toast, but alert is quick for now or just visual change
                                // Since we can't easily add a toast component now, let's just use alert or visual feedback
                                const btn = document.getElementById('copy-btn');
                                if (btn) {
                                    btn.style.backgroundColor = 'rgba(255,255,255,0.3)';
                                    setTimeout(() => btn.style.backgroundColor = '', 500);
                                }
                                // Ideally shows a floating tooltip "Copied!"
                            }}
                            id="copy-btn"
                            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/15 transition-all active:scale-95"
                            title="Copy Link"
                        >
                            <Link2 size={18} />
                        </button>

                        {/* Download Image Button */}
                        <button
                            id="download-btn"
                            onClick={async () => {
                                const btn = document.getElementById('download-btn');
                                if (btn) {
                                    btn.style.opacity = '0.5';
                                    btn.style.pointerEvents = 'none';
                                }
                                try {
                                    window.location.href = `/api/recap/${studentId}/share`;
                                } finally {
                                    setTimeout(() => {
                                        if (btn) {
                                            btn.style.opacity = '1';
                                            btn.style.pointerEvents = 'auto';
                                        }
                                    }, 2000);
                                }
                            }}
                            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/15 transition-all active:scale-95"
                            title="Download Recap Image"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
                        </button>
                    </div>
                </div>

                {/* Tap Navigation */}
                <div className="absolute inset-0 flex z-20">
                    <div className="w-1/3 h-full" onClick={prevSlide} />
                    <div className="w-2/3 h-full" onClick={nextSlide} />
                </div>
            </div>
        </div>
    );
}
