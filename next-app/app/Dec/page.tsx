'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    Zap,
    Globe,
    Terminal,
    Trophy,
    RefreshCw,
} from 'lucide-react';

// --- Configuration ---
const SLIDES = [
    {
        id: 'intro',
        type: 'intro',
        title: "2025 REWIND",
        subtitle: "Your Journey with ICPChue",
        icon: Trophy
    },
    {
        id: 'growth',
        type: 'stat-split',
        title: "Explosive Growth",
        data: [
            { label: "Student Registrations", value: "300+", icon: Users },
            { label: "Live Attendees", value: "160+", icon: Zap }
        ]
    },
    {
        id: 'impact',
        type: 'stat-highlight',
        title: "Digital Impact",
        mainStat: "10,000+",
        mainLabel: "Social Media Views",
        subStat: "500+ Unique Visitors"
    },
    {
        id: 'tech',
        type: 'tech-showcase',
        title: "Built From Scratch",
        subtitle: "No ready-made tools.",
        features: ["Custom LMS", "Native Online Judge", "Auto-Grading Engine"]
    },
    {
        id: 'curriculum',
        type: 'list-progress',
        title: "Knowledge Unlocked",
        items: [
            { label: "Data Types", pct: 100 },
            { label: "Control Structures", pct: 100 },
            { label: "Complexity Analysis", pct: 75 }
        ]
    },
    {
        id: 'summary',
        type: 'summary',
        title: "See you in 2026!",
        badges: ["Top 1% Growth", "Pioneer Cohort"]
    }
];

// --- Components ---

const ProgressBar = ({ total, current }: { total: number; current: number }) => (
    <div className="absolute top-4 left-4 right-4 flex gap-1 z-20">
        {Array.from({ length: total }).map((_, idx) => (
            <div key={idx} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                <motion.div
                    className="h-full bg-[#E8C15A]"
                    initial={{ width: "0%" }}
                    animate={{ width: idx < current ? "100%" : idx === current ? "100%" : "0%" }}
                    transition={{ duration: idx === current ? 5 : 0.3, ease: "linear" }}
                />
            </div>
        ))}
    </div>
);

type Slide = {
    id: string;
    type: string;
    title: string;
    subtitle?: string;
    icon?: React.ComponentType<{ size?: number }>;
    data?: Array<{ label: string; value: string; icon: React.ComponentType<{ size?: number }> }>;
    mainStat?: string;
    mainLabel?: string;
    subStat?: string;
    features?: string[];
    items?: Array<{ label: string; pct: number }>;
    badges?: string[];
};

const SlideIntro = ({ slide }: { slide: Slide }) => (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", damping: 12 }}
            className="w-24 h-24 rounded-full bg-[#E8C15A] text-black flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(232,193,90,0.4)]"
        >
            {slide.icon && <slide.icon size={48} />}
        </motion.div>
        <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-4xl font-black mb-2 tracking-tighter text-white"
        >
            {slide.title}
        </motion.h1>
        <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-[#E8C15A] font-medium text-lg uppercase tracking-widest"
        >
            {slide.subtitle}
        </motion.p>
    </div>
);

const SlideStatSplit = ({ slide }: { slide: Slide }) => (
    <div className="flex flex-col justify-center h-full p-8 gap-6">
        <h2 className="text-2xl font-bold text-center mb-4 text-[#A0A0A0]">{slide.title}</h2>
        {slide.data?.map((item, idx: number) => (
            <motion.div
                key={idx}
                initial={{ x: idx % 2 === 0 ? -50 : 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: idx * 0.2 }}
                className="bg-[#1A1A1A] p-6 rounded-2xl border border-[#E8C15A]/20 flex items-center gap-4 shadow-lg"
            >
                <div className="p-3 bg-[#E8C15A]/10 rounded-full text-[#E8C15A]">
                    <item.icon size={24} />
                </div>
                <div>
                    <div className="text-3xl font-bold text-white">{item.value}</div>
                    <div className="text-xs text-[#A0A0A0] uppercase tracking-wider">{item.label}</div>
                </div>
            </motion.div>
        ))}
    </div>
);

const SlideStatHighlight = ({ slide }: { slide: Slide }) => (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="mb-2 text-[#E8C15A] font-bold tracking-widest uppercase text-sm">{slide.title}</div>
        <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", bounce: 0.5 }}
            className="text-6xl font-black text-white mb-2 bg-clip-text text-transparent bg-gradient-to-br from-white to-[#A0A0A0]"
        >
            {slide.mainStat}
        </motion.div>
        <div className="text-[#A0A0A0] mb-12">{slide.mainLabel}</div>

        <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-[#1A1A1A] px-6 py-3 rounded-full border border-[#E8C15A]/30 text-[#E8C15A] font-mono text-sm"
        >
            <Globe className="inline mr-2 w-4 h-4" />
            {slide.subStat}
        </motion.div>
    </div>
);

const SlideTech = ({ slide }: { slide: Slide }) => (
    <div className="flex flex-col justify-center h-full p-8">
        <div className="text-[#E8C15A] text-xl font-bold mb-1">{slide.title}</div>
        <div className="text-[#A0A0A0] mb-8">{slide.subtitle}</div>

        <div className="space-y-4">
            {slide.features?.map((feat: string, idx: number) => (
                <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.15 }}
                    className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-[#1A1A1A] to-transparent border-l-4 border-[#E8C15A]"
                >
                    <Terminal size={18} className="text-[#E8C15A]" />
                    <span className="font-mono text-sm text-white">{feat}</span>
                </motion.div>
            ))}
        </div>

        <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-8 h-px w-full bg-[#E8C15A]/30"
        />
    </div>
);

const SlideProgress = ({ slide }: { slide: Slide }) => (
    <div className="flex flex-col justify-center h-full p-8">
        <h2 className="text-3xl font-bold mb-8 text-center text-white">{slide.title}</h2>
        <div className="space-y-6">
            {slide.items?.map((item, idx: number) => (
                <div key={idx}>
                    <div className="flex justify-between mb-2 text-sm font-medium text-white">
                        <span>{item.label}</span>
                        <span className="text-[#E8C15A]">{item.pct}%</span>
                    </div>
                    <div className="h-3 bg-[#1A1A1A] rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${item.pct}%` }}
                            transition={{ duration: 1, delay: idx * 0.2 }}
                            className="h-full bg-[#E8C15A]"
                        />
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const SlideSummary = ({ slide, onReplay }: { slide: Slide; onReplay: () => void }) => (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center relative">
        <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm bg-gradient-to-b from-[#1A1A1A] to-[#000000] p-8 rounded-2xl border border-[#E8C15A] shadow-[0_0_40px_rgba(232,193,90,0.15)]"
        >
            <Trophy className="w-16 h-16 text-[#E8C15A] mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-white mb-2">ICPChue</h2>
            <div className="text-[#A0A0A0] mb-6">2025 Season Recap</div>

            <div className="flex justify-center gap-2 mb-8">
                {slide.badges?.map((badge: string, idx: number) => (
                    <span key={idx} className="bg-[#E8C15A]/20 text-[#E8C15A] text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider">
                        {badge}
                    </span>
                ))}
            </div>

            <button
                onClick={onReplay}
                className="flex items-center justify-center gap-2 w-full py-3 bg-[#E8C15A] text-black font-bold rounded-lg hover:bg-[#D4AF37] transition-colors"
            >
                <RefreshCw size={18} /> Replay
            </button>
        </motion.div>
    </div>
);

// --- Main Widget Container ---

export default function RecapWidget() {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [direction, setDirection] = useState(0);

    const nextSlide = () => {
        if (currentSlide < SLIDES.length - 1) {
            setDirection(1);
            setCurrentSlide(curr => curr + 1);
        }
    };

    const prevSlide = () => {
        if (currentSlide > 0) {
            setDirection(-1);
            setCurrentSlide(curr => curr - 1);
        }
    };

    const restart = () => {
        setDirection(-1);
        setCurrentSlide(0);
    };

    // Auto-advance logic disabled for manual control
    // useEffect(() => {
    //   const timer = setTimeout(() => {
    //      if (currentSlide < SLIDES.length - 1) nextSlide();
    //   }, 5000);
    //   return () => clearTimeout(timer);
    // }, [currentSlide]);

    const renderSlide = (slide: Slide) => {
        switch (slide.type) {
            case 'intro': return <SlideIntro slide={slide} />;
            case 'stat-split': return <SlideStatSplit slide={slide} />;
            case 'stat-highlight': return <SlideStatHighlight slide={slide} />;
            case 'tech-showcase': return <SlideTech slide={slide} />;
            case 'list-progress': return <SlideProgress slide={slide} />;
            case 'summary': return <SlideSummary slide={slide} onReplay={restart} />;
            default: return null;
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
            {/* Phone/Card Container */}
            <div className="relative w-full max-w-md aspect-[9/16] max-h-[850px] bg-[#121212] rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(232,193,90,0.1)] border border-[#333]">

                {/* Progress Bar */}
                <ProgressBar total={SLIDES.length} current={currentSlide} />

                {/* Header Branding */}
                <div className="absolute top-8 left-0 w-full flex justify-center z-10 opacity-50">
                    <span className="text-[10px] font-bold tracking-[0.3em] text-[#E8C15A]">ICPCHUE REWIND</span>
                </div>

                {/* Content Area */}
                <div className="absolute inset-0 z-0">
                    <AnimatePresence initial={false} custom={direction} mode="wait">
                        <motion.div
                            key={currentSlide}
                            custom={direction}
                            initial={{ x: direction > 0 ? 300 : -300, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: direction > 0 ? -300 : 300, opacity: 0, scale: 0.9 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="w-full h-full absolute top-0 left-0"
                        >
                            {renderSlide(SLIDES[currentSlide])}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Tap Navigation Zones */}
                <div className="absolute inset-0 flex z-30">
                    <div className="w-1/3 h-full cursor-w-resize active:bg-white/5 transition-colors" onClick={prevSlide} />
                    <div className="w-2/3 h-full cursor-e-resize active:bg-white/5 transition-colors" onClick={nextSlide} />
                </div>

                {/* Bottom branding / helper */}
                <div className="absolute bottom-6 w-full text-center z-20 pointer-events-none">
                    {currentSlide === 0 && (
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="text-[#A0A0A0] text-xs animate-bounce"
                        >
                            Tap right to continue
                        </motion.div>
                    )}
                </div>

            </div>
        </div>
    );
}
