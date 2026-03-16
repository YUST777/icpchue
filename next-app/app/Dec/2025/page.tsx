'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ReportsHub() {
    return (
        <div className="min-h-screen bg-black text-white selection:bg-[#E8C15A] selection:text-black">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/5">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="relative w-8 h-8">
                            <Image
                                src="/icpchue-logo.webp"
                                alt="ICPC HUE"
                                fill
                                className="object-contain group-hover:scale-110 transition-transform"
                            />
                        </div>
                        <span className="font-bold tracking-tight">ICPC HUE</span>
                    </Link>
                    <nav className="flex items-center gap-6 text-sm font-medium text-white/60">
                        <Link href="/" className="hover:text-white transition-colors">Home</Link>
                        <span className="text-[#E8C15A]">Reports</span>
                    </nav>
                </div>
            </header>

            <main className="pt-32 pb-20 px-6 max-w-7xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="mb-16"
                >
                    <h1 className="text-4xl md:text-6xl font-black mb-4 tracking-tighter">
                        Community <span className="text-[#E8C15A]">Reports</span>
                    </h1>
                    <p className="text-xl text-white/60 max-w-2xl">
                        Monthly summaries of our progress, achievements, and technical milestones.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* December Card */}
                    <Link href="/2025/dec" className="group relative bg-[#111] rounded-3xl overflow-hidden border border-white/5 hover:border-[#E8C15A]/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(232,193,90,0.1)]">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#E8C15A]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                        <div className="p-8 relative z-10">
                            <div className="flex justify-between items-start mb-12">
                                <div className="w-12 h-12 rounded-full bg-[#1a1a1a] flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform duration-300">
                                    <Calendar className="text-[#E8C15A]" size={20} />
                                </div>
                                <span className="bg-[#E8C15A]/10 text-[#E8C15A] text-xs font-bold px-3 py-1 rounded-full border border-[#E8C15A]/20">
                                    2025
                                </span>
                            </div>

                            <h3 className="text-2xl font-bold mb-2 group-hover:text-[#E8C15A] transition-colors">December</h3>
                            <p className="text-white/50 text-sm mb-6">
                                Launch, First Training Camps, and Building our Infrastructure.
                            </p>

                            <div className="flex items-center gap-2 text-sm font-bold text-white group-hover:gap-3 transition-all">
                                Read Report <ArrowRight size={16} className="text-[#E8C15A]" />
                            </div>
                        </div>
                    </Link>

                    {/* Placeholder for Next Month */}
                    <div className="group relative bg-[#0a0a0a] rounded-3xl p-8 border border-white/5 border-dashed flex flex-col justify-center items-center text-center opacity-50 cursor-not-allowed">
                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
                            <Calendar className="text-white/20" size={20} />
                        </div>
                        <h3 className="text-xl font-bold text-white/40 mb-1">January</h3>
                        <p className="text-white/20 text-sm">Coming Soon</p>
                    </div>
                </div>
            </main>
        </div>
    );
}
