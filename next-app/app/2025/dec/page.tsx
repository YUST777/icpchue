'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Code, Zap, Globe, Trophy, PlayCircle, Facebook, Linkedin, Calendar } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function DecemberReportPage() {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [direction, setDirection] = useState(0);

    const totalSlides = 6;
    const nextSlide = () => { if (currentSlide < totalSlides - 1) { setDirection(1); setCurrentSlide(c => c + 1); } };
    const prevSlide = () => { if (currentSlide > 0) { setDirection(-1); setCurrentSlide(c => c - 1); } };
    const goToSlide = (idx: number) => { if (idx !== currentSlide) { setDirection(idx > currentSlide ? 1 : -1); setCurrentSlide(idx); } };

    // Shared Header
    const Header = () => (
        <div className="flex items-center justify-between px-4 md:px-6 pt-3 md:pt-4 pb-1 md:pb-2">
            <Image src="/icpchue-logo.webp" alt="ICPC HUE" width={24} height={24} className="w-6 h-6 md:w-7 md:h-7 object-contain" />
            <span className="text-white/90 text-xs md:text-sm font-medium italic">December 2025 Report</span>
        </div>
    );

    // Slide 1: Intro
    const IntroSlide = () => (
        <div className="absolute inset-0 flex flex-col">
            <div className="absolute inset-0 bg-gradient-to-br from-[#1a1510] via-[#0d0d0d] to-[#0a1015]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_#E8C15A20_0%,_transparent_50%)]" />

            <div className="relative z-10 h-full">
                <Header />
                <div className="px-4 md:px-6 pt-4 md:pt-8">
                    <h1 className="text-xl md:text-3xl lg:text-4xl font-bold text-white mb-4 md:mb-6">
                        Community <span className="text-[#E8C15A]">Rewind</span>,
                    </h1>
                    <p className="text-base md:text-xl lg:text-2xl leading-relaxed">
                        <span className="text-white/75">Our journey in </span>
                        <span className="text-white font-bold">December 2025</span>
                        <br />
                        <span className="text-white/75">was incredible.</span>
                    </p>
                </div>

                <div className="absolute left-1/2 -translate-x-1/2 top-[65%] -translate-y-1/2">
                    <div className="px-6 py-3 rounded-2xl bg-white/5 border border-[#E8C15A]/30 backdrop-blur-md shadow-[0_0_30px_rgba(232,193,90,0.1)] flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#E8C15A] flex items-center justify-center text-black font-bold shadow-lg">
                            <Calendar size={20} />
                        </div>
                        <div className="text-left">
                            <div className="text-[#E8C15A] text-[10px] font-bold tracking-widest uppercase">Monthly Report</div>
                            <div className="text-white font-bold text-lg leading-none">December 2025</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    // Slide 2: Timeline
    const TimelineSlide = () => (
        <div className="absolute inset-0 flex flex-col bg-gradient-to-b from-[#0a0a0a] to-[#111]">
            <div className="relative z-10 flex flex-col h-full">
                <Header />
                <div className="flex-1 flex flex-col justify-center px-6 md:px-10 pb-16 md:pb-20">
                    <h2 className="text-2xl md:text-4xl font-bold text-white mb-6 md:mb-8">
                        Timeline & <span className="text-[#E8C15A]">Engagement</span>
                    </h2>

                    <div className="space-y-6">
                        <div className="flex gap-4">
                            <div className="w-1 bg-[#E8C15A]/30 flex flex-col items-center relative"><div className="w-3 h-3 rounded-full bg-[#E8C15A] absolute -left-1"></div></div>
                            <div>
                                <div className="text-[#E8C15A] text-xs font-bold uppercase tracking-wider mb-1">Nov 28</div>
                                <div className="text-white font-bold text-lg">Launch</div>
                                <div className="text-white/60 text-sm">300+ Student Registrations</div>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="w-1 bg-[#E8C15A]/30 flex flex-col items-center relative"><div className="w-3 h-3 rounded-full bg-[#E8C15A] absolute -left-1"></div></div>
                            <div>
                                <div className="text-[#E8C15A] text-xs font-bold uppercase tracking-wider mb-1">Dec 7</div>
                                <div className="text-white font-bold text-lg">First Live Session</div>
                                <div className="text-white/60 text-sm">160+ Attendees</div>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="w-1 bg-[#E8C15A]/30 flex flex-col items-center relative"><div className="w-3 h-3 rounded-full bg-[#E8C15A] absolute -left-1"></div></div>
                            <div>
                                <div className="text-[#E8C15A] text-xs font-bold uppercase tracking-wider mb-1">Dec 7 - 20</div>
                                <div className="text-white font-bold text-lg">Training Camps</div>
                                <div className="text-white/60 text-sm">Approval Camp & Winter Camp</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    // Slide 3: Curriculum (New)
    const CurriculumSlide = () => (
        <div className="absolute inset-0 flex flex-col bg-gradient-to-b from-[#1a1510] to-[#0a0a0a]">
            {/* Background effects */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_#E8C15A10_0%,_transparent_50%)]" />
            <div className="relative z-10 flex flex-col h-full">
                <Header />
                <div className="flex-1 flex flex-col justify-center px-6 md:px-10 pb-16 md:pb-20">
                    <p className="text-white/60 text-[10px] md:text-xs uppercase tracking-widest mb-2">Education Delivered</p>
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">
                        5+ Hours of <span className="text-[#E8C15A]">Content</span>
                    </h2>

                    <p className="text-white/80 text-sm mb-6 leading-relaxed">
                        We covered a <span className="text-[#E8C15A]">full curriculum</span> from <span className="text-white font-bold">Data Types</span> all the way to <span className="text-white font-bold">Complexity Analysis</span> across 4 intensive sessions.
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                        <Link href="/dashboard/sessions/programming1/1" className="bg-white/5 p-3 rounded-lg border border-white/10 hover:border-[#E8C15A]/50 hover:bg-white/10 transition-all group">
                            <div className="text-[#E8C15A] text-xs font-bold mb-1 group-hover:text-[#FFF] flex items-center gap-1">Session 1 <PlayCircle size={10} /></div>
                            <div className="text-white/60 text-[10px]">Data Types & I/O</div>
                        </Link>
                        <Link href="/dashboard/sessions/programming1/2" className="bg-white/5 p-3 rounded-lg border border-white/10 hover:border-[#E8C15A]/50 hover:bg-white/10 transition-all group">
                            <div className="text-[#E8C15A] text-xs font-bold mb-1 group-hover:text-[#FFF] flex items-center gap-1">Session 2 <PlayCircle size={10} /></div>
                            <div className="text-white/60 text-[10px]">Control Structures</div>
                        </Link>
                        <Link href="/dashboard/sessions/programming1/4" className="bg-white/5 p-3 rounded-lg border border-white/10 hover:border-[#E8C15A]/50 hover:bg-white/10 transition-all group">
                            <div className="text-[#E8C15A] text-xs font-bold mb-1 group-hover:text-[#FFF] flex items-center gap-1">Session 4 <PlayCircle size={10} /></div>
                            <div className="text-white/60 text-[10px]">Complexity Analysis</div>
                        </Link>
                        <Link href="/dashboard/sessions" className="bg-[#E8C15A]/10 p-3 rounded-lg border border-[#E8C15A]/30 flex items-center justify-center text-[#E8C15A] font-bold text-xs hover:bg-[#E8C15A] hover:text-black transition-all">
                            All Sessions <ChevronRight size={14} className="ml-1" />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );

    // Slide 4: Tech
    const TechSlide = () => (
        <div className="absolute inset-0 flex flex-col bg-gradient-to-b from-[#0d0d0d] to-[#0a0a0a]">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#E8C15A05_0%,_transparent_70%)]" />
            <div className="relative z-10 flex flex-col h-full">
                <Header />
                <div className="flex-1 flex flex-col justify-center px-6 md:px-10 pb-16 md:pb-20">
                    <p className="text-white/60 text-[10px] md:text-xs uppercase tracking-widest mb-2">Our Platform</p>
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">
                        Technical <span className="text-[#E8C15A]">Innovation</span>
                    </h2>
                    <p className="text-white/80 text-sm mb-8 leading-relaxed">
                        We developed <span className="text-[#E8C15A]">icpchue.com</span> entirely from scratch, skipping ready-made tools.
                    </p>

                    <div className="grid gap-4">
                        <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                            <div className="text-[#E8C15A] font-bold mb-1 flex items-center gap-2"><Trophy size={16} /> Full Dashboard</div>
                            <div className="text-white/60 text-xs">Complete LMS tracking profiles, achievements, and rewards.</div>
                        </div>
                        <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                            <div className="text-[#E8C15A] font-bold mb-1 flex items-center gap-2"><Code size={16} /> Custom Online Judge</div>
                            <div className="text-white/60 text-xs">Our own compiler system similar to Codeforces.</div>
                        </div>
                        <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                            <div className="text-[#E8C15A] font-bold mb-1 flex items-center gap-2"><Zap size={16} /> Content Archive</div>
                            <div className="text-white/60 text-xs">All sessions and materials permanently stored.</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    // Slide 5: Impact
    const ImpactSlide = () => (
        <div className="absolute inset-0 flex flex-col bg-gradient-to-br from-[#0a0a0a] via-[#0d0d0d] to-[#0a0808]">
            <div className="relative z-10 flex flex-col h-full">
                <Header />
                <div className="flex-1 flex flex-col justify-center px-4 md:px-6 pb-16 md:pb-20 text-center">
                    <p className="text-white/60 text-[10px] md:text-xs uppercase tracking-widest mb-6">Digital Impact</p>

                    <div className="mb-8">
                        <div className="text-6xl md:text-7xl font-black text-white mb-2">500+</div>
                        <div className="flex items-center justify-center gap-2 text-[#E8C15A] font-bold text-lg uppercase tracking-wider">
                            <Globe size={20} /> Website Visitors
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex flex-col items-center justify-center">
                            <div className="text-3xl font-bold text-white mb-1">10k+</div>
                            <div className="text-white/60 text-xs uppercase mb-3">Social Views</div>
                            <div className="flex gap-2">
                                <Facebook size={16} className="text-blue-500" />
                                <Linkedin size={16} className="text-blue-400" />
                                {/* Telegram SVG */}
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-300"><path d="M21.198 2.433a2.242 2.242 0 0 0-1.022.215l-8.609 3.33c-2.068.8-4.133 1.598-5.724 2.21a405.15 405.15 0 0 1-2.863 1.13l-4.907 1.89c-1.167.448-1.5 1.968-.454 2.472l4.897 2.357c.725.35 1.52.733 2.19 1.056l3.87 1.864c.25.12.56.27.84.404l4.314 2.078c1.334.643 2.766-.628 2.22-1.956l-3.34-8.12C13 8.5 16 5.5 19 2.5c1-1-1-3-2-2z" /></svg>
                            </div>
                        </div>
                        <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex flex-col items-center justify-center">
                            <div className="text-3xl font-bold text-white mb-1">400+</div>
                            <div className="text-white/60 text-xs uppercase">Followers</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    // Slide 6: Summary
    const SummarySlide = () => (
        <div className="absolute inset-0 flex flex-col bg-gradient-to-b from-[#1a1510] via-[#0a0a0a] to-[#0a0808]">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#E8C15A20_0%,_transparent_50%)]" />
            <div className="relative z-10 flex flex-col h-full">
                <Header />
                <div className="flex-1 flex flex-col items-center justify-center px-4 md:px-6 pb-16 md:pb-20 text-center">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#E8C15A] to-[#B89830] flex items-center justify-center mb-6">
                        <Trophy className="w-10 h-10 text-black" />
                    </div>

                    <h2 className="text-3xl font-bold text-white mb-2">See you in 2026!</h2>
                    <p className="text-white/60 text-sm max-w-xs mx-auto mb-8">
                        Thank you for being part of our incredible start. We&apos;re just getting started.
                    </p>

                    <Link href="/2025" className="px-8 py-3 bg-[#E8C15A] text-black font-bold rounded-xl hover:bg-[#D4AF37] transition-all">
                        Back to Reports
                    </Link>
                </div>
            </div>
        </div>
    );

    const slides = [IntroSlide, TimelineSlide, CurriculumSlide, TechSlide, ImpactSlide, SummarySlide];
    const CurrentSlide = slides[currentSlide];

    return (
        <div className="min-h-screen min-h-[100dvh] bg-black flex items-center justify-center">
            <div className="relative w-full max-w-full md:max-w-[500px] h-[100dvh] md:h-[627px] bg-black overflow-hidden md:rounded-2xl md:shadow-2xl">
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
                        <button key={idx} onClick={() => goToSlide(idx)} className="h-5 flex-1 flex items-center cursor-pointer group">
                            <div className="h-[3px] md:h-1 w-full bg-white/25 rounded-full overflow-hidden group-hover:bg-white/35 transition-colors">
                                <motion.div className="h-full bg-white rounded-full" initial={{ width: '0%' }} animate={{ width: idx <= currentSlide ? '100%' : '0%' }} transition={{ duration: 0.3 }} />
                            </div>
                        </button>
                    ))}
                </div>

                <div className="absolute inset-0 flex z-20">
                    <div className="w-1/3 h-full" onClick={prevSlide} />
                    <div className="w-2/3 h-full" onClick={nextSlide} />
                </div>
            </div>
        </div>
    );
}
