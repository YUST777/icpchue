'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
    Sparkles,
    Search,
    ArrowLeft,
    X,
    ChevronRight
} from 'lucide-react';
import { SiFacebook, SiTelegram } from 'react-icons/si';
import { FaLinkedin } from 'react-icons/fa';
import dynamic from 'next/dynamic';
import { MapExpandedProvider } from '@/context/MapExpandedContext';

// Dynamically import BuildingPublicly to avoid SSR issues with ReactFlow
const BuildingPublicly = dynamic(() => import('@/components/landing/BuildingPublicly'), {
    ssr: false,
    loading: () => <div className="w-full h-96 bg-zinc-900/50 rounded-3xl animate-pulse" />
});

interface DevLogEntryProps {
    entry: {
        id: number;
        version_short: string;
        category: string;
        date: string;
        title: string;
        subtitle: string;
        description: string;
        content?: string;
        highlights?: string[];
    };
    searchQuery: string;
}

const DevLogEntry = ({ entry, searchQuery }: DevLogEntryProps) => {
    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString;
            return new Intl.DateTimeFormat('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
            }).format(date);
        } catch (e) {
            return dateString;
        }
    };

    return (
        <div className={`flex flex-col md:flex-row justify-between gap-8 ${searchQuery ? 'mb-12 pb-12' : 'mb-24 pb-24'} last:mb-0 last:pb-0 border-b border-zinc-100 dark:border-zinc-800 last:border-0 transition-all duration-300`}>
            {/* Left Column: Version & Meta */}
            <div className="w-full md:w-1/3">
                <div className="sticky top-24">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 flex items-center justify-center bg-gradient-to-br from-[#f58416] to-[#f8dc6d] rounded-full shadow-sm">
                            <span className="text-white font-black text-[10px] uppercase tracking-tight">
                                {entry.version_short}
                            </span>
                        </div>
                        <div>
                            <div className="text-zinc-900 dark:text-zinc-100 font-semibold text-sm">
                                {entry.category}
                            </div>
                            <div className="text-zinc-500 dark:text-zinc-400 text-xs font-medium">
                                {formatDate(entry.date)}
                            </div>
                            <div className="text-zinc-400 dark:text-zinc-600 text-[10px] font-bold uppercase tracking-wider mt-1 flex items-center gap-1">
                                <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700"></span>
                                {(() => {
                                    const text = (entry.content || entry.description) + (entry.highlights?.join(' ') || '');
                                    const words = text.trim().split(/\s+/).length;
                                    const minutes = Math.ceil(words / 200);
                                    return `${minutes} min read`;
                                })()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Column: Content */}
            <div className="w-full md:w-2/3">
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-1 tracking-tight">
                    {entry.title}
                </h2>
                <div className="text-lg text-zinc-500 dark:text-zinc-400 mb-6 font-medium leading-tight">
                    {entry.subtitle}
                </div>

                <div className="prose prose-zinc dark:prose-invert max-w-none prose-p:text-zinc-600 dark:prose-p:text-zinc-400 prose-p:leading-relaxed">
                    <p className="mb-6">
                        {entry.description}
                    </p>

                    {entry.highlights && entry.highlights.length > 0 && (
                        <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-6 mb-6">
                            <div className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-4">
                                Technical Implementation
                            </div>
                            <ul className="space-y-3 m-0 p-0 list-none">
                                {(entry.highlights || []).map((highlight, idx) => (
                                    <li key={idx} className="flex items-start gap-3 text-[14px] text-zinc-700 dark:text-zinc-300">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#E8C15A] mt-[7px] shrink-0 shadow-[0_0_8px_rgba(232,193,90,0.5)]" />
                                        {highlight}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <Link
                        href={`/devlog/${entry.id}`}
                        className="inline-flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-white hover:text-[#E8C15A] dark:hover:text-[#E8C15A] transition-colors group/link"
                    >
                        Read Update
                        <ChevronRight size={16} className="transition-transform group-hover/link:translate-x-1" />
                    </Link>
                </div>
            </div>
        </div>
    );
};

import { devLogs, LogEntry } from '@/lib/content/devlog';
import { searchDevLogs } from '@/lib/content/devlog-search';

export default function DevLogPage() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setTimeout(() => {
            setLogs(devLogs);
            setLoading(false);
        }, 400);
    }, []);

    // Handle search using useMemo instead of useEffect to avoid setState in effect
    const filteredLogs = useMemo(() => {
        if (searchQuery.trim() === '') {
            return logs;
        } else {
            const results = searchDevLogs(searchQuery);
            return results.map(r => r.entry);
        }
    }, [searchQuery, logs]);

    return (
        <MapExpandedProvider>
            <div className="min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-zinc-100 font-sans selection:bg-[#E8C15A]/30 selection:text-zinc-900 dark:selection:text-zinc-100">
                {/* Header */}
                <header className="sticky top-0 z-50 border-b border-zinc-100 dark:border-zinc-800 bg-white/90 dark:bg-black/90 backdrop-blur-sm">
                    <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/dashboard" className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                                <ArrowLeft size={18} />
                                <span className="text-sm font-medium hidden sm:inline">Back</span>
                            </Link>
                        </div>
                    </div>
                </header>

                <main className="max-w-4xl mx-auto px-6 py-20">
                    {/* Intro */}
                    <div className="mb-20">

                        <h1 className="text-[56px] font-extrabold tracking-tight mb-8 leading-[1.1] text-zinc-900 dark:text-white pb-2">
                            ICPCHUE <br />
                            <span className="bg-gradient-to-br from-[#f58416] to-[#f8dc6d] bg-clip-text text-transparent italic">Development log</span>
                        </h1>
                        <p className="text-xl text-zinc-500 dark:text-zinc-400 max-w-xl leading-relaxed font-medium mb-12">
                            The technical journey of building the icpchue.com.
                        </p>

                        {/* Search Bar */}
                        <div className="mt-8 max-w-xl">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Search size={20} className="text-zinc-400" />
                                </div>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search updates... (e.g., 2025, security, v2.0)"
                                    className="w-full pl-12 pr-12 py-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#E8C15A] focus:border-transparent transition-all shadow-sm"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                                    >
                                        <X size={18} />
                                    </button>
                                )}
                            </div>
                            {searchQuery && (
                                <div className="mt-4">
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4 px-1">
                                        Found {filteredLogs.length} {filteredLogs.length === 1 ? 'result' : 'results'}
                                    </p>

                                    {filteredLogs.length > 0 && (
                                        <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden mb-12 shadow-xl ring-1 ring-black/5">
                                            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                                {filteredLogs.slice(0, 5).map(entry => (
                                                    <Link
                                                        key={entry.id}
                                                        href={`/devlog/${entry.id}`}
                                                        className="flex items-center justify-between p-4 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group"
                                                    >
                                                        <div>
                                                            <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-[#E8C15A] transition-colors">
                                                                {entry.title}
                                                            </div>
                                                            <div className="text-xs text-zinc-500 dark:text-zinc-500">
                                                                {entry.version_short} • {entry.category}
                                                            </div>
                                                        </div>
                                                        <ChevronRight size={16} className="text-zinc-400 group-hover:translate-x-1 transition-transform" />
                                                    </Link>
                                                ))}
                                                {filteredLogs.length > 5 && (
                                                    <div className="p-3 text-center text-xs text-zinc-500 bg-zinc-100/50 dark:bg-zinc-800/50">
                                                        Scroll down to see {filteredLogs.length - 5} more results
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Architecture Diagram */}
                    <div className="mb-0 -mx-6 md:-mx-12 lg:-mx-20">
                        <BuildingPublicly />
                    </div>

                    {/* Entries Container */}
                    <div className={`${searchQuery ? 'pt-8' : 'pt-20'} border-t border-zinc-100 dark:border-zinc-800 transition-all duration-300`}>
                        {loading ? (
                            <div className="space-y-20 animate-pulse">
                                {[1, 2].map(i => (
                                    <div key={i} className="flex gap-12">
                                        <div className="w-1/3 h-24 bg-zinc-100 dark:bg-zinc-900 rounded-xl" />
                                        <div className="w-2/3 h-64 bg-zinc-100 dark:bg-zinc-900 rounded-xl" />
                                    </div>
                                ))}
                            </div>
                        ) : filteredLogs.length > 0 ? (
                            filteredLogs.map(entry => (
                                <DevLogEntry key={entry.id} entry={entry} searchQuery={searchQuery} />
                            ))
                        ) : (
                            <div className="text-center py-20">
                                <p className="text-zinc-500 dark:text-zinc-400 text-lg">No results found for &quot;{searchQuery}&quot;</p>
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="mt-4 text-sm text-[#E8C15A] hover:underline"
                                >
                                    Clear search
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Banner Upgrade */}
                    <div className="mt-32 p-10 rounded-[2rem] bg-[#E8C15A] text-black overflow-hidden relative group">
                        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div>
                                <div className="flex items-center gap-2 text-black/60 font-bold text-xs uppercase tracking-[0.2em] mb-3">
                                    <Sparkles size={14} />
                                    READY TO SOLVE?
                                </div>
                                <h2 className="text-3xl font-black tracking-tight">Access the HUE Arena</h2>
                                <p className="text-black/70 mt-2 max-w-md font-medium text-sm leading-relaxed">
                                    The Sheet-1 curriculum is now active for all registered students. Start your journey today and climb the leaderboard.
                                </p>
                            </div>
                            <Link href="/dashboard" className="whitespace-nowrap px-8 py-4 bg-black text-white font-bold rounded-2xl hover:bg-zinc-800 transition-all shadow-xl shadow-black/20 hover:scale-105 active:scale-95">
                                Get Started
                            </Link>
                        </div>
                        {/* Decorative Elements */}
                        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-white/30 rounded-full blur-3xl opacity-50 group-hover:scale-110 transition-transform duration-700"></div>
                        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-48 h-48 bg-black/5 rounded-full blur-2xl opacity-50"></div>
                    </div>

                    {/* Footer */}
                </main>

                {/* Footer */}
                {/* Footer */}
                <footer className="mt-20 pt-8 border-t border-white/10 pb-12 px-6">
                    <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                        {/* Brand */}
                        <div className="flex items-center gap-3">
                            <span className="font-bold text-zinc-200">ICPC HUE</span>
                            <span className="hidden md:inline text-zinc-700 mx-2">|</span>
                            <span className="text-xs text-zinc-500 font-medium uppercase tracking-widest">DevLog</span>
                        </div>

                        {/* Social Icons - Centered */}
                        <div className="flex gap-8 items-center">
                            <a href="https://www.facebook.com/icpchue/" target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-[#1877F2] hover:scale-110 transition-all"><SiFacebook size={20} /></a>
                            <a href="https://www.linkedin.com/in/icpchue/" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-[#0A66C2] transition-colors"><FaLinkedin size={24} /></a>
                            <a href="https://t.me/ICPCHUE" target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-[#26A5E4] hover:scale-110 transition-all"><SiTelegram size={20} /></a>
                        </div>

                        {/* Update Info */}
                        <div className="text-zinc-500 text-xs font-medium border border-white/5 bg-white/5 px-4 py-1.5 rounded-full">
                            Last update: <span className="text-zinc-300">January 10, 2026</span>
                        </div>
                    </div>
                </footer>
            </div>

        </MapExpandedProvider >
    );
}
