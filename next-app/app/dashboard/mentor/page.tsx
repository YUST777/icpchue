'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
    Search, Users, AlertTriangle, ShieldAlert, CheckCircle2, 
    Clock, ArrowRight, LayoutGrid, Table, Flame, ExternalLink,
    ChevronDown, Send, BookOpen
} from 'lucide-react';
import { SiCodeforces } from 'react-icons/si';

interface TraineeSummary {
    total_trainees: number;
    active_trainees: number;
    stuck_trainees: number;
    flagged_trainees: number;
    inactive_trainees: number;
    level_distribution: {
        level_0: number;
        level_1: number;
        level_2: number;
        level_3: number;
    };
}

interface TraineeItem {
    id: number;
    name: string;
    student_id: string;
    academic_level: string;
    faculty: string;
    email: string;
    phone?: string;
    telegram?: string;
    codeforces_handle?: string;
    total_solved: number;
    total_attempted: number;
    total_submissions: number;
    progress_percentage: number;
    current_streak: number;
    max_streak: number;
    last_active_at?: string | null;
    days_since_active: number;
    flags_count: number;
    is_shadow_banned: boolean;
    is_stuck: boolean;
    is_inactive: boolean;
    status_badge: 'ACTIVE' | 'STUCK' | 'FLAGGED' | 'BANNED' | 'INACTIVE';
}

export default function MentorTraineesDirectoryPage() {
    const [trainees, setTrainees] = useState<TraineeItem[]>([]);
    const [summary, setSummary] = useState<TraineeSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [levelFilter, setLevelFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'flagged' | 'inactive' | 'active' | 'stuck'>('all');
    const [sortBy, setSortBy] = useState<'solves_desc' | 'recent_active' | 'streak_desc' | 'name_asc'>('solves_desc');
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

    const abortControllerRef = useRef<AbortController | null>(null);

    const fetchTrainees = async () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;

        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.set('search', search);
            if (levelFilter !== 'all') params.set('level', levelFilter);
            if (statusFilter !== 'all') params.set('status', statusFilter);
            if (sortBy) params.set('sortBy', sortBy);

            const res = await fetch(`/api/mentor/trainees?${params.toString()}`, {
                signal: controller.signal
            });
            if (res.ok) {
                const data = await res.json();
                setTrainees(data.trainees || []);
                setSummary(data.summary || null);
            }
        } catch (err: any) {
            if (err.name !== 'AbortError') {
                console.error('Failed to fetch trainees:', err);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchTrainees();
        }, 200);
        return () => clearTimeout(timer);
    }, [search, levelFilter, statusFilter, sortBy]);

    const formatLastActive = (isoStr?: string | null) => {
        if (!isoStr) return 'Never';
        const d = new Date(isoStr);
        if (isNaN(d.getTime())) return 'Never';
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
            {/* 1. Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2 rounded-xl bg-[#E8C15A]/10 text-[#E8C15A] border border-[#E8C15A]/20">
                            <Users size={20} />
                        </div>
                        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">Mentor Command Center</h1>
                    </div>
                    <p className="text-xs text-white/50">
                        Live analytics, individual curriculum tracking, and forensic code inspection.
                    </p>
                </div>
            </div>

            {/* 2. Top Summary KPI Cards */}
            {summary && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    <div 
                        onClick={() => setStatusFilter('all')}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                            statusFilter === 'all'
                                ? 'bg-[#E8C15A]/10 border-[#E8C15A]/30 text-white'
                                : 'bg-[#121214]/90 border-white/[0.08] hover:bg-white/[0.03]'
                        }`}
                    >
                        <span className="text-[10px] uppercase font-semibold text-white/40 block">Total Trainees</span>
                        <span className="text-2xl font-bold text-white mt-1 block">{summary.total_trainees}</span>
                        <span className="text-[11px] text-white/50 font-mono mt-0.5 block">All Cohorts</span>
                    </div>

                    <div 
                        onClick={() => setStatusFilter('active')}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                            statusFilter === 'active'
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-white'
                                : 'bg-[#121214]/90 border-white/[0.08] hover:bg-white/[0.03]'
                        }`}
                    >
                        <span className="text-[10px] uppercase font-semibold text-emerald-400/80 block">Active & Steady</span>
                        <span className="text-2xl font-bold text-emerald-400 mt-1 block">{summary.active_trainees}</span>
                        <span className="text-[11px] text-emerald-400/60 font-mono mt-0.5 block">Active this week</span>
                    </div>

                    <div 
                        onClick={() => setStatusFilter(statusFilter === 'stuck' ? 'all' : 'stuck')}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                            statusFilter === 'stuck'
                                ? 'bg-orange-500/15 border-orange-500/35 text-white'
                                : 'bg-[#121214]/90 border-white/[0.08] hover:bg-white/[0.03]'
                        }`}
                    >
                        <span className="text-[10px] uppercase font-semibold text-orange-400/80 block">Stuck Trainees</span>
                        <span className="text-2xl font-bold text-orange-400 mt-1 block">{summary.stuck_trainees || 0}</span>
                        <span className="text-[11px] text-orange-400/60 font-mono mt-0.5 block">&gt;3 failed attempts</span>
                    </div>

                    <div 
                        onClick={() => setStatusFilter('inactive')}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                            statusFilter === 'inactive'
                                ? 'bg-amber-500/10 border-amber-500/30 text-white'
                                : 'bg-[#121214]/90 border-white/[0.08] hover:bg-white/[0.03]'
                        }`}
                    >
                        <span className="text-[10px] uppercase font-semibold text-amber-400/80 block">Inactive</span>
                        <span className="text-2xl font-bold text-amber-400 mt-1 block">{summary.inactive_trainees}</span>
                        <span className="text-[11px] text-amber-400/60 font-mono mt-0.5 block">&gt; 7 days absent</span>
                    </div>

                    <div 
                        onClick={() => setStatusFilter('flagged')}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer col-span-2 sm:col-span-1 ${
                            statusFilter === 'flagged'
                                ? 'bg-red-500/10 border-red-500/30 text-white'
                                : 'bg-[#121214]/90 border-white/[0.08] hover:bg-white/[0.03]'
                        }`}
                    >
                        <span className="text-[10px] uppercase font-semibold text-red-400/80 block">Integrity Flags</span>
                        <span className="text-2xl font-bold text-red-400 mt-1 block">{summary.flagged_trainees}</span>
                        <span className="text-[11px] text-red-400/60 font-mono mt-0.5 block">Audit required</span>
                    </div>
                </div>
            )}

            {/* 3. Search & Filters Bar */}
            <div className="bg-[#121214]/90 border border-white/[0.08] rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-md backdrop-blur-xl">
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 w-4 h-4" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search student name, student ID, CF handle, or email..."
                        className="w-full bg-[#0B0B0C] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#E8C15A] transition-colors"
                    />
                </div>

                {/* Filter Controls */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Level Filter */}
                    <div className="relative">
                        <select
                            value={levelFilter}
                            onChange={(e) => setLevelFilter(e.target.value)}
                            className="bg-[#0B0B0C] border border-white/10 text-white text-xs rounded-xl px-3 py-2 pr-8 appearance-none focus:outline-none focus:border-[#E8C15A] cursor-pointer"
                        >
                            <option value="all">All Levels</option>
                            <option value="Level 0">Level 0 (Intro)</option>
                            <option value="Level 1">Level 1 (Newcomers)</option>
                            <option value="Level 2">Level 2 (Intermediate)</option>
                            <option value="Level 3">Level 3 (Advanced)</option>
                        </select>
                        <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                    </div>

                    {/* Sort By */}
                    <div className="relative">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="bg-[#0B0B0C] border border-white/10 text-white text-xs rounded-xl px-3 py-2 pr-8 appearance-none focus:outline-none focus:border-[#E8C15A] cursor-pointer"
                        >
                            <option value="solves_desc">Most Solved</option>
                            <option value="recent_active">Recent Activity</option>
                            <option value="streak_desc">Highest Streak</option>
                            <option value="name_asc">Name (A-Z)</option>
                        </select>
                        <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                    </div>

                    {/* View Switcher */}
                    <div className="flex items-center bg-[#0B0B0C] p-1 rounded-xl border border-white/10">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-lg transition-colors ${
                                viewMode === 'grid' ? 'bg-white/10 text-[#E8C15A]' : 'text-white/40 hover:text-white'
                            }`}
                            title="Grid View"
                        >
                            <LayoutGrid size={14} />
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            className={`p-1.5 rounded-lg transition-colors ${
                                viewMode === 'table' ? 'bg-white/10 text-[#E8C15A]' : 'text-white/40 hover:text-white'
                            }`}
                            title="Table View"
                        >
                            <Table size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {/* 4. Trainees List */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="h-48 bg-[#121214] border border-white/5 rounded-2xl animate-pulse" />
                    ))}
                </div>
            ) : trainees.length === 0 ? (
                <div className="text-center py-16 bg-[#121214] border border-white/5 rounded-2xl text-white/40">
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
                            href={`/dashboard/mentor/${encodeURIComponent(String(t.student_id || t.id))}`}
                            className="bg-[#121214]/90 border border-white/[0.08] hover:border-[#E8C15A]/40 rounded-2xl p-5 transition-all duration-200 group flex flex-col justify-between hover:bg-white/[0.02] shadow-md hover:shadow-xl backdrop-blur-xl"
                        >
                            <div>
                                {/* Top Badges */}
                                <div className="flex items-center justify-between gap-2 mb-3">
                                    <span className="text-[11px] font-semibold text-[#E8C15A] px-2.5 py-0.5 rounded-full bg-[#E8C15A]/10 border border-[#E8C15A]/20">
                                        {t.academic_level}
                                    </span>

                                    {t.flags_count > 0 || t.is_shadow_banned ? (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
                                            <ShieldAlert size={11} /> {t.flags_count ? `${t.flags_count} Flags` : 'Shadow Banned'}
                                        </span>
                                    ) : t.is_inactive ? (
                                        <span className="text-[10px] font-semibold text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded-full">
                                            Inactive
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#E8C15A] bg-[#E8C15A]/10 px-2 py-0.5 rounded-full border border-[#E8C15A]/20">
                                            <CheckCircle2 size={10} /> Active
                                        </span>
                                    )}
                                </div>

                                {/* Identity */}
                                <div>
                                    <h3 className="text-base font-bold text-white group-hover:text-[#E8C15A] transition-colors truncate">
                                        {t.name}
                                    </h3>
                                    <div className="flex items-center gap-2 text-xs text-white/50 font-mono mt-0.5">
                                        <span>{t.student_id}</span>
                                        {t.codeforces_handle && (
                                            <span className="flex items-center gap-1 text-white/60">
                                                • <SiCodeforces className="text-red-400" size={10} /> {t.codeforces_handle}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-white/40 truncate mt-1">{t.faculty}</p>
                                </div>

                                {/* Progress Bar */}
                                <div className="mt-4 space-y-1.5">
                                    <div className="flex justify-between text-xs font-mono">
                                        <span className="text-white/50">Curriculum Progress</span>
                                        <span className="font-bold text-[#E8C15A]">{t.total_solved} Solved</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                        <div 
                                            style={{ width: `${t.progress_percentage || Math.min(100, Math.round((t.total_solved / 150) * 100))}%` }} 
                                            className="h-full bg-[#E8C15A] rounded-full"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Card Footer */}
                            <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-white/50">
                                <div className="flex items-center gap-1">
                                    <Clock size={11} />
                                    <span>Active {formatLastActive(t.last_active_at)}</span>
                                </div>
                                <div className="flex items-center gap-1 text-[#E8C15A] font-semibold group-hover:translate-x-0.5 transition-transform">
                                    <span>Open Dossier</span>
                                    <ArrowRight size={12} />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                /* Table View */
                <div className="bg-[#121214]/90 border border-white/[0.08] rounded-2xl overflow-hidden shadow-md backdrop-blur-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-white/[0.08] bg-white/[0.02] text-white/40 text-[10px] font-semibold uppercase tracking-wider">
                                    <th className="py-3 px-4">Trainee</th>
                                    <th className="py-3 px-4">Level</th>
                                    <th className="py-3 px-4">Codeforces</th>
                                    <th className="py-3 px-4 text-center">Solved</th>
                                    <th className="py-3 px-4 text-center">Streak</th>
                                    <th className="py-3 px-4">Last Active</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.04]">
                                {trainees.map((t) => (
                                    <tr 
                                        key={t.id}
                                        className="hover:bg-white/[0.02] transition-colors group"
                                    >
                                        <td className="py-3 px-4">
                                            <div dir="auto" className="font-bold text-white group-hover:text-[#E8C15A] transition-colors">
                                                {t.name}
                                            </div>
                                            <div className="text-[11px] font-mono text-white/40">{t.student_id}</div>
                                        </td>
                                        <td className="py-3 px-4 text-white/70">
                                            <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px]">
                                                {t.academic_level}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 font-mono text-white/60">
                                            {t.codeforces_handle ? (
                                                <span className="flex items-center gap-1.5">
                                                    <SiCodeforces className="text-red-400" size={11} />
                                                    {t.codeforces_handle}
                                                </span>
                                            ) : '-'}
                                        </td>
                                        <td className="py-3 px-4 text-center font-mono font-bold text-[#E8C15A]">
                                            {t.total_solved}
                                        </td>
                                        <td className="py-3 px-4 text-center font-mono text-white/80">
                                            {t.current_streak > 0 ? (
                                                <span className="flex items-center justify-center gap-1 text-[#E8C15A]">
                                                    <Flame size={12} /> {t.current_streak}d
                                                </span>
                                            ) : '-'}
                                        </td>
                                        <td className="py-3 px-4 text-white/50 text-[11px] font-mono">
                                            {formatLastActive(t.last_active_at)}
                                        </td>
                                        <td className="py-3 px-4">
                                            {t.flags_count > 0 || t.is_shadow_banned ? (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
                                                    <ShieldAlert size={10} /> {t.flags_count ? `${t.flags_count} Flags` : 'Banned'}
                                                </span>
                                            ) : t.is_inactive ? (
                                                <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                                                    Inactive
                                                </span>
                                            ) : (
                                                <span className="text-[10px] text-[#E8C15A] bg-[#E8C15A]/10 px-2 py-0.5 rounded-full border border-[#E8C15A]/20">
                                                    Active
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <Link
                                                href={`/dashboard/mentor/${encodeURIComponent(String(t.student_id || t.id))}`}
                                                className="inline-flex items-center gap-1 px-3 py-1 bg-white/5 hover:bg-[#E8C15A] text-white hover:text-black font-semibold rounded-lg text-xs transition-colors"
                                            >
                                                <span>Inspect</span>
                                                <ArrowRight size={11} />
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
