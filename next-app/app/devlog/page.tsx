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
import { Skeleton } from '@/components/ui/Skeleton';

// Dynamically import BuildingPublicly to avoid SSR issues with ReactFlow
const BuildingPublicly = dynamic(() => import('@/components/landing/BuildingPublicly'), {
    ssr: false,
    loading: () => <Skeleton className="w-full h-96 rounded-3xl" />
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
        } catch {
            return dateString;
        }
    };

    return (
        <div className={`flex flex-col md:flex-row justify-between gap-6 md:gap-8 ${searchQuery ? 'mb-12 pb-12' : 'mb-20 pb-20'} last:mb-0 last:pb-0 border-b border-white/[0.08] last:border-0 transition-colors duration-200`}>
            {/* Left Column: Version & Meta */}
            <div className="w-full md:w-1/3">
                <div className="sticky top-24">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="h-11 w-11 flex items-center justify-center rounded-[var(--radius-control)] border border-[#E8C15A]/40 bg-[#E8C15A]/10">
                            <span className="text-[#E8C15A] font-semibold text-xs uppercase tracking-tight">
                                {entry.version_short}
                            </span>
                        </div>
                        <div>
                            <div className="text-[var(--color-text)] font-semibold text-sm">
                                {entry.category}
                            </div>
                            <div className="text-[var(--color-text-secondary)] text-xs font-medium">
                                {formatDate(entry.date)}
                            </div>
                            <div className="text-[var(--color-text-muted)] text-xs font-medium mt-1 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#E8C15A]"></span>
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
                <h2 className="text-2xl font-semibold text-[var(--color-text)] mb-1 tracking-tight">
                    {entry.title}
                </h2>
                <div className="text-lg text-[var(--color-text-secondary)] mb-6 leading-tight">
                    {entry.subtitle}
                </div>

                <div className="prose prose-invert max-w-none prose-p:text-[var(--color-text-secondary)] prose-p:leading-relaxed">
                    <p className="mb-6">
                        {entry.description}
                    </p>

                    {entry.highlights && entry.highlights.length > 0 && (
                        <div className="ui-card p-5 mb-6">
                            <div className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-4">
                                Technical Implementation
                            </div>
                            <ul className="space-y-3 m-0 p-0 list-none">
                                {(entry.highlights || []).map((highlight, idx) => (
                                    <li key={idx} className="flex items-start gap-3 text-sm text-[var(--color-text-secondary)]">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#E8C15A] mt-[7px] shrink-0" />
                                        {highlight}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <Link
                        href={`/devlog/${entry.id}`}
                        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--color-text)] hover:text-[#E8C15A] transition-colors group/link"
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
            <div className="min-h-screen bg-[var(--color-page)] text-[var(--color-text)] font-sans selection:bg-[#E8C15A]/30 selection:text-[var(--color-text)]">
                {/* Header */}
                <header className="sticky top-0 z-50 border-b border-[var(--color-line)] bg-[var(--color-page)]/95 backdrop-blur-sm">
                    <div className="ui-container max-w-4xl h-16 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/dashboard" aria-label="Back to dashboard" className="inline-flex min-h-11 min-w-11 items-center gap-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
                                <ArrowLeft size={18} />
                                <span className="text-sm font-medium hidden sm:inline">Back</span>
                            </Link>
                        </div>
                    </div>
                </header>

                <main className="ui-container max-w-4xl py-16 md:py-20">
                    {/* Intro */}
                    <div className="mb-16 md:mb-20">

                        <h1 className="ui-page-title mb-6 md:mb-8">
                            ICPCHUE <br />
                            <span className="text-[#E8C15A]">Development log</span>
                        </h1>
                        <p className="text-lg text-[var(--color-text-secondary)] max-w-xl leading-relaxed mb-10">
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
                                    aria-label="Search development updates"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search updates... (e.g., 2025, security, v2.0)"
                                    className="ui-field pl-12 pr-12 text-base sm:text-sm"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        aria-label="Clear search"
                                        onClick={() => setSearchQuery('')}
                                        className="absolute inset-y-0 right-0 w-11 flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                                    >
                                        <X size={18} />
                                    </button>
                                )}
                            </div>
                            {searchQuery && (
                                <div className="mt-4">
                                    <p className="text-sm text-[var(--color-text-muted)] mb-4 px-1">
                                        Found {filteredLogs.length} {filteredLogs.length === 1 ? 'result' : 'results'}
                                    </p>

                                    {filteredLogs.length > 0 && (
                                        <div className="ui-card overflow-hidden mb-12">
                                            <div className="divide-y divide-white/[0.08]">
                                                {filteredLogs.slice(0, 5).map(entry => (
                                                    <Link
                                                        key={entry.id}
                                                        href={`/devlog/${entry.id}`}
                                                        className="flex min-h-16 items-center justify-between gap-4 p-4 hover:bg-[var(--color-raised)] transition-colors group"
                                                    >
                                                        <div>
                                                            <div className="text-sm font-semibold text-[var(--color-text)] group-hover:text-[#E8C15A] transition-colors">
                                                                {entry.title}
                                                            </div>
                                                            <div className="text-sm text-[var(--color-text-muted)]">
                                                                {entry.version_short} · {entry.category}
                                                            </div>
                                                        </div>
                                                        <ChevronRight size={16} className="text-zinc-400 group-hover:translate-x-1 transition-transform" />
                                                    </Link>
                                                ))}
                                                {filteredLogs.length > 5 && (
                                                    <div className="p-3 text-center text-sm text-[var(--color-text-muted)] bg-[var(--color-raised)]">
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
                    <div className="mb-0 min-w-0">
                        <BuildingPublicly />
                    </div>

                    {/* Entries Container */}
                    <div className={`${searchQuery ? 'pt-8' : 'pt-20'} border-t border-[var(--color-line)] transition-colors duration-200`}>
                        {loading ? (
                            <div className="space-y-16">
                                {[1, 2].map(i => (
                                    <div key={i} className="flex flex-col md:flex-row gap-6 md:gap-12">
                                        <Skeleton className="w-full md:w-1/3 h-24 rounded-[var(--radius-card)]" />
                                        <Skeleton className="w-full md:w-2/3 h-64 rounded-[var(--radius-card)]" />
                                    </div>
                                ))}
                            </div>
                        ) : filteredLogs.length > 0 ? (
                            filteredLogs.map(entry => (
                                <DevLogEntry key={entry.id} entry={entry} searchQuery={searchQuery} />
                            ))
                        ) : (
                            <div className="text-center py-20">
                                <p className="text-[var(--color-text-secondary)] text-lg">No results found for &quot;{searchQuery}&quot;</p>
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="ui-button-secondary mt-4"
                                >
                                    Clear search
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Banner Upgrade */}
                    <div className="ui-panel mt-24 p-6 md:p-8 border-[#E8C15A]/35">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                            <div>
                                <div className="flex items-center gap-2 text-[#E8C15A] font-semibold text-xs uppercase tracking-wider mb-3">
                                    <Sparkles size={14} />
                                    READY TO SOLVE?
                                </div>
                                <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-[var(--color-text)]">Access the HUE Arena</h2>
                                <p className="text-[var(--color-text-secondary)] mt-2 max-w-md text-sm leading-relaxed">
                                    The Sheet-1 curriculum is now active for all registered students. Start your journey today and climb the leaderboard.
                                </p>
                            </div>
                            <Link href="/dashboard" className="ui-button-primary whitespace-nowrap">
                                Get Started
                            </Link>
                        </div>
                    </div>

                    {/* Footer */}
                </main>

                {/* Footer */}
                {/* Footer */}
                <footer className="mt-20 pt-8 border-t border-[var(--color-line)] pb-12 px-6">
                    <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                        {/* Brand */}
                        <div className="flex items-center gap-3">
                            <span className="font-semibold text-[var(--color-text)]">ICPC HUE</span>
                            <span className="hidden md:inline text-[var(--color-text-muted)] mx-2">|</span>
                            <span className="text-xs text-[var(--color-text-muted)] font-medium uppercase tracking-wider">DevLog</span>
                        </div>

                        {/* Social Icons - Centered */}
                        <div className="flex gap-2 items-center">
                            <a aria-label="Facebook" href="https://www.facebook.com/icpchue/" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 min-w-11 items-center justify-center text-[var(--color-text-muted)] hover:text-[#1877F2] transition-colors"><SiFacebook size={20} /></a>
                            <a aria-label="LinkedIn" href="https://www.linkedin.com/in/icpchue/" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 min-w-11 items-center justify-center text-[var(--color-text-muted)] hover:text-[#0A66C2] transition-colors"><FaLinkedin size={24} /></a>
                            <a aria-label="Telegram" href="https://t.me/ICPCHUE" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 min-w-11 items-center justify-center text-[var(--color-text-muted)] hover:text-[#26A5E4] transition-colors"><SiTelegram size={20} /></a>
                        </div>

                        {/* Update Info */}
                        <div className="text-[var(--color-text-muted)] text-sm font-medium border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-2 rounded-[var(--radius-control)]">
                            Last update: <span className="text-[var(--color-text-secondary)]">January 10, 2026</span>
                        </div>
                    </div>
                </footer>
            </div>

        </MapExpandedProvider >
    );
}
