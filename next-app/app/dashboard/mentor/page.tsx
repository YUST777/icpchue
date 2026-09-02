'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
    Users, Search, Filter, Flame, AlertTriangle, 
    ArrowUpRight, ShieldAlert, CheckCircle2, ChevronRight,
    LayoutGrid, List, RefreshCw, BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SiCodeforces } from 'react-icons/si';

interface TraineeSummary {
    id: number;
    application_id?: number;
    name: string;
    student_id: string;
    email: string;
    faculty: string;
    academic_level: string;
    phone?: string;
    telegram?: string;
    codeforces_handle?: string;
    role: string;
    solved_count: number;
    solve_percentage: number;
    total_submissions: number;
    current_streak: number;
    max_streak: number;
    cheating_flags: number;
    is_shadow_banned: boolean;
    last_login_at?: string | null;
    last_solve_at?: string | null;
    is_inactive: boolean;
    is_flagged: boolean;
}

interface SummaryStats {
    total_trainees: number;
    active_count: number;
    inactive_count: number;
    flagged_count: number;
    total_curriculum_problems: number;
}

export default function MentorDirectoryPage() {
    const [trainees, setTrainees] = useState<TraineeSummary[]>([]);
    const [summary, setSummary] = useState<SummaryStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [levelFilter, setLevelFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'flagged' | 'inactive' | 'active'>('all');
    const [sortBy, setSortBy] = useState<'solved_desc' | 'activity_desc' | 'streak_desc' | 'name_asc'>('solved_desc');
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

    const fetchTrainees = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.set('q', search);
            if (levelFilter !== 'all') params.set('level', levelFilter);
            if (statusFilter !== 'all') params.set('filter', statusFilter);
            if (sortBy) params.set('sort', sortBy);

            const res = await fetch(`/api/mentor/trainees?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setTrainees(data.trainees || []);
                setSummary(data.summary || null);
            }
        } catch (err) {
            console.error('Failed to fetch trainees:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchTrainees();
        }, 250);
        return () => clearTimeout(timer);
    }, [search, levelFilter, statusFilter, sortBy]);

    const formatLastActive = (isoStr?: string | null) => {
        if (!isoStr) return 'Never';
        const d = new Date(isoStr);
        const diffMs = Date.now() - d.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        if (diffHours < 1) return 'Just now';
        if (diffHours < 24) return `${diffHours}h ago`;
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays}d ago`;
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <div className="min-h-screen bg-[#0B0B0C] text-white p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
            {/* Page Header & Ribbon */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-white/5">
                <div>
                    <div className="flex items-center gap-2 text-xs text-[#E8C15A] font-semibold uppercase tracking-wider mb-1">
                        <Users size={16} /> Mentor Panel
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
                        Trainees Directory
                    </h1>
                    <p className="text-xs md:text-sm text-white/50 mt-1">
                        Monitor live student progress, analyze solving behaviors, and inspect code submissions.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchTrainees}
                        className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-all"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Quick Summary KPIs */}
            {summary && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                    <div className="bg-[#121214] border border-white/[0.08] rounded-2xl p-4">
                        <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider block">Total Trainees</span>
                        <div className="text-2xl font-black text-white mt-1">{summary.total_trainees}</div>
                        <span className="text-[11px] text-white/50 mt-0.5 block">{summary.total_curriculum_problems} total problems</span>
                    </div>
                    <div className="bg-[#121214] border border-white/[0.08] rounded-2xl p-4">
                        <span className="text-[10px] uppercase font-bold text-emerald-400/80 tracking-wider block">Active Recently</span>
                        <div className="text-2xl font-black text-emerald-400 mt-1">{summary.active_count}</div>
                        <span className="text-[11px] text-white/50 mt-0.5 block">Logged in &lt; 7 days</span>
                    </div>
                    <div className="bg-[#121214] border border-white/[0.08] rounded-2xl p-4">
                        <span className="text-[10px] uppercase font-bold text-amber-400/80 tracking-wider block">Inactive Trainees</span>
                        <div className="text-2xl font-black text-amber-400 mt-1">{summary.inactive_count}</div>
                        <span className="text-[11px] text-white/50 mt-0.5 block">Need mentor follow-up</span>
                    </div>
                    <div className="bg-[#121214] border border-white/[0.08] rounded-2xl p-4">
                        <span className="text-[10px] uppercase font-bold text-red-400/80 tracking-wider block">Integrity Flags</span>
                        <div className="text-2xl font-black text-red-400 mt-1">{summary.flagged_count}</div>
                        <span className="text-[11px] text-white/50 mt-0.5 block">Plagiarism / Shadow banned</span>
                    </div>
                </div>
            )}

            {/* Filter & Search Toolbar */}
            <div className="bg-[#121214] border border-white/[0.08] rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-lg">
                {/* Search Input */}
                <div className="relative flex-1 min-w-[240px]">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 w-4 h-4" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search trainee by name, student ID, Codeforces handle, or email..."
                        className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs md:text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#E8C15A] transition-all"
                    />
                </div>

                {/* Status Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-1">
                    {(['all', 'active', 'inactive', 'flagged'] as const).map((st) => (
                        <button
                            key={st}
                            onClick={() => setStatusFilter(st)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all shrink-0 ${
                                statusFilter === st
                                    ? 'bg-[#E8C15A] text-black shadow-md'
                                    : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                            }`}
                        >
                            {st}
                        </button>
                    ))}
                </div>

                {/* Level & Sort Selector */}
                <div className="flex items-center gap-2">
                    <select
                        value={levelFilter}
                        onChange={(e) => setLevelFilter(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white/80 focus:outline-none focus:border-[#E8C15A]"
                    >
                        <option value="all" className="bg-[#121214]">All Levels</option>
                        <option value="level 0" className="bg-[#121214]">Level 0</option>
                        <option value="level 1" className="bg-[#121214]">Level 1</option>
                        <option value="level 2" className="bg-[#121214]">Level 2</option>
                        <option value="level 3" className="bg-[#121214]">Level 3</option>
                    </select>

                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white/80 focus:outline-none focus:border-[#E8C15A]"
                    >
                        <option value="solved_desc" className="bg-[#121214]">Most Solved</option>
                        <option value="activity_desc" className="bg-[#121214]">Recent Activity</option>
                        <option value="streak_desc" className="bg-[#121214]">Longest Streak</option>
                        <option value="name_asc" className="bg-[#121214]">Name (A-Z)</option>
                    </select>

                    {/* View Switcher */}
                    <div className="flex items-center bg-white/5 rounded-xl p-1 border border-white/10">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-lg transition-all ${
                                viewMode === 'grid' ? 'bg-[#E8C15A]/20 text-[#E8C15A]' : 'text-white/40 hover:text-white'
                            }`}
                            title="Grid View"
                        >
                            <LayoutGrid size={16} />
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            className={`p-1.5 rounded-lg transition-all ${
                                viewMode === 'table' ? 'bg-[#E8C15A]/20 text-[#E8C15A]' : 'text-white/40 hover:text-white'
                            }`}
                            title="Table View"
                        >
                            <List size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Trainees Content */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="h-44 bg-[#121214] border border-white/5 rounded-2xl animate-pulse" />
                    ))}
                </div>
            ) : trainees.length === 0 ? (
                <div className="bg-[#121214] border border-white/10 rounded-2xl p-12 text-center text-white/40 space-y-2">
                    <Users size={32} className="mx-auto text-white/20 mb-2" />
                    <p className="text-base font-semibold text-white">No trainees found</p>
                    <p className="text-xs">Try adjusting your search query or status filter.</p>
                </div>
            ) : viewMode === 'grid' ? (
                /* Grid View */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {trainees.map((t) => (
                        <Link
                            key={t.id}
                            href={`/dashboard/mentor/${t.student_id || t.id}`}
                            className="bg-[#121214] border border-white/[0.08] hover:border-[#E8C15A]/40 rounded-2xl p-5 transition-all duration-200 group flex flex-col justify-between hover:bg-white/[0.02] shadow-md hover:shadow-xl"
                        >
                            <div>
                                {/* Top Badges */}
                                <div className="flex items-center justify-between gap-2 mb-3">
                                    <span className="text-[11px] font-semibold text-[#E8C15A] px-2 py-0.5 rounded-full bg-[#E8C15A]/10 border border-[#E8C15A]/20">
                                        {t.academic_level}
                                    </span>

                                    {t.is_flagged ? (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
                                            <ShieldAlert size={11} /> {t.cheating_flags || 1} Flags
                                        </span>
                                    ) : t.is_inactive ? (
                                        <span className="text-[10px] font-semibold text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded-full">
                                            Inactive
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Active
                                        </span>
                                    )}
                                </div>

                                {/* Student Name & Details */}
                                <h3 className="text-base font-bold text-white group-hover:text-[#E8C15A] transition-colors truncate">
                                    {t.name}
                                </h3>
                                <div className="flex items-center gap-2 text-xs text-white/50 mt-1">
                                    <span className="font-mono text-white/70">{t.student_id}</span>
                                    <span>•</span>
                                    <span className="truncate">{t.faculty}</span>
                                </div>

                                {/* CF Handle */}
                                {t.codeforces_handle && (
                                    <div className="flex items-center gap-1.5 text-xs text-white/70 font-semibold mt-2">
                                        <SiCodeforces className="text-red-400" size={12} />
                                        <span>{t.codeforces_handle}</span>
                                    </div>
                                )}
                            </div>

                            {/* Bottom Solved & Streak Progress */}
                            <div className="pt-4 mt-4 border-t border-white/5 space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-white/50">Solved Problems</span>
                                    <span className="font-bold text-emerald-400">{t.solved_count} ({t.solve_percentage}%)</span>
                                </div>
                                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                    <div 
                                        style={{ width: `${t.solve_percentage}%` }} 
                                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                                    />
                                </div>

                                <div className="flex items-center justify-between text-[11px] text-white/40 pt-1">
                                    <span className="flex items-center gap-1">
                                        <Flame size={12} className="text-[#E8C15A]" /> {t.current_streak}d streak
                                    </span>
                                    <span>Last solve: {formatLastActive(t.last_solve_at)}</span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                /* Table View */
                <div className="bg-[#121214] border border-white/[0.08] rounded-2xl overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="text-white/40 border-b border-white/5 font-semibold text-[11px] uppercase tracking-wider bg-white/[0.02]">
                                    <th className="py-3.5 pl-4">Student</th>
                                    <th className="py-3.5">Level</th>
                                    <th className="py-3.5 text-center">Solved</th>
                                    <th className="py-3.5 text-center">Streak</th>
                                    <th className="py-3.5">CF Handle</th>
                                    <th className="py-3.5">Status</th>
                                    <th className="py-3.5 text-center">Last Active</th>
                                    <th className="py-3.5 pr-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.03]">
                                {trainees.map((t) => (
                                    <tr key={t.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="py-3 pl-4">
                                            <div className="font-bold text-white group-hover:text-[#E8C15A] transition-colors">
                                                {t.name}
                                            </div>
                                            <div className="text-[11px] text-white/50 font-mono">
                                                {t.student_id}
                                            </div>
                                        </td>
                                        <td className="py-3 text-white/70">
                                            {t.academic_level}
                                        </td>
                                        <td className="py-3 text-center font-bold text-emerald-400">
                                            {t.solved_count}
                                        </td>
                                        <td className="py-3 text-center text-[#E8C15A] font-semibold">
                                            {t.current_streak}d
                                        </td>
                                        <td className="py-3 font-medium text-white/80">
                                            {t.codeforces_handle || '-'}
                                        </td>
                                        <td className="py-3">
                                            {t.is_flagged ? (
                                                <span className="text-red-400 font-bold bg-red-500/10 px-2 py-0.5 rounded text-[10px]">
                                                    {t.cheating_flags || 1} Flags
                                                </span>
                                            ) : t.is_inactive ? (
                                                <span className="text-amber-400 font-semibold text-[10px]">
                                                    Inactive
                                                </span>
                                            ) : (
                                                <span className="text-emerald-400 font-semibold text-[10px]">
                                                    Active
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3 text-center text-white/50 text-[11px]">
                                            {formatLastActive(t.last_solve_at || t.last_login_at)}
                                        </td>
                                        <td className="py-3 pr-4 text-right">
                                            <Link
                                                href={`/dashboard/mentor/${t.student_id || t.id}`}
                                                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-white/5 hover:bg-[#E8C15A] text-white hover:text-black font-semibold text-xs transition-all"
                                            >
                                                <span>Dossier</span>
                                                <ChevronRight size={14} />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
