'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import {
    Users, Activity, TrendingUp, FileText, Clock, AlertTriangle,
    Search, ChevronLeft, ChevronRight, RefreshCw, Loader2,
    BarChart3, BookOpen, Zap, Trophy, Eye, EyeOff, Shield
} from 'lucide-react';

/* ─── types ──────────────────────────────────────────────── */
interface OverviewData {
    totalUsers: number; totalSubmissions: number; submissionsToday: number;
    activeUsers: number; newUsers: number; appsPendingAccount: number;
    shadowBannedCount: number;
    verdictBreakdown: { verdict: string; count: number }[];
    submissionsByDay: { day: string; count: number }[];
    totalUsersByDay: { day: string; count: number }[];
    activeUsersByDay: { day: string; count: number }[];
    newUsersByDay: { day: string; count: number }[];
    topSheets: { id: string; name: string; slug: string; levelSlug: string; totalProblems: number; activity: number }[];
}
interface UserRow {
    id: number; email: string; role: string; isVerified: boolean; isShadowBanned: boolean;
    cheatingFlags: number; createdAt: string; lastLoginAt: string | null; codeforcesHandle: string | null;
    name: string | null; studentId: string | null; faculty: string | null;
    solvedCount: number; totalSubmissions: number;
}
interface SheetRow {
    id: string; name: string; slug: string; totalProblems: number; levelName: string; levelSlug: string;
    usersSolved: number; totalSolves: number; uniqueProblemsSolved: number;
    avgTimeSeconds: number | null; completionRate: string; fullCompletions: number;
}
interface SubRow {
    id: string; userId: number; userName: string | null; sheetName: string | null;
    problemId: string; verdict: string; timeMs: number; memoryKb: number;
    submittedAt: string; language: string; source: string;
}
interface RankingRow {
    rank: number; userId: number; name: string; faculty: string | null; studentId: string | null;
    codeforcesHandle: string | null; solved: number; totalSeconds: number; totalSubmissions: number;
    isShadowBanned: boolean; cheatingFlags: number;
}
interface Pagination { page: number; limit: number; total: number; totalPages: number }

/* ─── colors ─────────────────────────────────────────────── */
const GOLD = '#E8C15A';
const VERDICT_COLORS: Record<string, string> = {
    Accepted: '#34d399', 'Wrong Answer': '#f87171', 'Time Limit Exceeded': '#fbbf24',
    'Runtime Error': '#c084fc', 'Compilation Error': '#fb923c', 'Memory Limit Exceeded': '#60a5fa'
};
const PIE_COLORS = ['#34d399', '#f87171', '#fbbf24', '#c084fc', '#fb923c', '#60a5fa', '#94a3b8'];

const CHART_COLORS = {
    gold: { stroke: '#E8C15A', fill: '#E8C15A' },
    emerald: { stroke: '#34d399', fill: '#34d399' },
    blue: { stroke: '#60a5fa', fill: '#60a5fa' },
    purple: { stroke: '#a78bfa', fill: '#a78bfa' },
    orange: { stroke: '#fb923c', fill: '#fb923c' },
    rose: { stroke: '#fb7185', fill: '#fb7185' },
};

/* ─── time range options ─────────────────────────────────── */
const TIME_RANGES = [
    { key: '1d', label: '1D' },
    { key: '7d', label: '7D' },
    { key: '14d', label: '14D' },
    { key: '1m', label: '1M' },
    { key: 'all', label: 'All' },
] as const;

const RANGE_LABELS: Record<string, string> = {
    '1d': 'Last 24 Hours', '7d': 'Last 7 Days', '14d': 'Last 14 Days',
    '1m': 'Last Month', 'all': 'All Time',
};

/* ─── helpers ────────────────────────────────────────────── */
const fmt = (n: number) => n >= 1_000_000 ? (n / 1_000_000).toFixed(1) + 'M' : n >= 1000 ? (n / 1000).toFixed(1) + 'k' : n.toString();
const timeAgo = (d: string | null) => {
    if (!d) return 'Never';
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
};
const fmtDay = (day: string) => {
    const d = new Date(day);
    return d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
};

/* ─── big metric chart card ──────────────────────────────── */
function MetricChart({ title, value, data, color, unit }: {
    title: string; value: string | number; data: { day: string; count: number }[];
    color: keyof typeof CHART_COLORS; unit?: string;
}) {
    const c = CHART_COLORS[color];
    const gradientId = `grad-${title.replace(/\s/g, '')}`;
    const chartData = data.map(d => ({ day: fmtDay(d.day), count: d.count }));
    const max = Math.max(...data.map(d => d.count), 1);
    const trend = data.length >= 2 ? data[data.length - 1].count - data[data.length - 2].count : 0;

    return (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 hover:border-white/10 transition-all">
            <div className="flex items-start justify-between mb-1">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30">{title}</p>
                    <div className="flex items-baseline gap-2 mt-1">
                        <p className="text-3xl font-black tracking-tight" style={{ color: c.stroke }}>{value}</p>
                        {unit && <span className="text-[10px] text-white/20 font-medium">{unit}</span>}
                        {trend !== 0 && (
                            <span className={`text-[10px] font-bold ${trend > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}
                            </span>
                        )}
                    </div>
                </div>
            </div>
            <div className="h-[140px] mt-3">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={c.fill} stopOpacity={0.25} />
                                <stop offset="100%" stopColor={c.fill} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                        <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                        <YAxis tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9 }} axisLine={false} tickLine={false} domain={[0, Math.ceil(max * 1.1)]} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px' }}
                            labelStyle={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}
                            itemStyle={{ color: c.stroke, fontWeight: 700, fontSize: 13 }}
                            formatter={(v: number) => [v, title]}
                        />
                        <Area type="monotone" dataKey="count" stroke={c.stroke} strokeWidth={2} fill={`url(#${gradientId})`} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

/* ─── verdict badge ──────────────────────────────────────── */
function VerdictBadge({ verdict }: { verdict: string }) {
    const color = VERDICT_COLORS[verdict] || '#94a3b8';
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider"
            style={{ backgroundColor: color + '15', color, border: `1px solid ${color}30` }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
            {verdict === 'Wrong Answer' ? 'WA' : verdict === 'Time Limit Exceeded' ? 'TLE' :
                verdict === 'Runtime Error' ? 'RE' : verdict === 'Compilation Error' ? 'CE' :
                    verdict === 'Memory Limit Exceeded' ? 'MLE' : verdict === 'Accepted' ? 'AC' : verdict}
        </span>
    );
}

/* ─── circular progress ──────────────────────────────────── */
function CircularProgress({ pct, size = 56 }: { pct: number; size?: number }) {
    const r = (size - 8) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - (Math.min(pct, 100) / 100) * circ;
    const color = pct >= 70 ? '#34d399' : pct >= 30 ? '#fbbf24' : '#f87171';
    return (
        <svg width={size} height={size} className="transform -rotate-90">
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={4} />
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={4}
                strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
                className="transition-all duration-1000 ease-out" />
            <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
                className="fill-white text-[11px] font-bold transform rotate-90" style={{ transformOrigin: 'center' }}>
                {pct.toFixed(0)}%
            </text>
        </svg>
    );
}

/* ─── time range filter ──────────────────────────────────── */
function TimeRangeFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
        <div className="flex items-center gap-1 bg-white/[0.02] border border-white/[0.06] rounded-xl p-1">
            {TIME_RANGES.map(r => (
                <button key={r.key} onClick={() => onChange(r.key)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${value === r.key
                        ? 'bg-[#E8C15A]/10 text-[#E8C15A] border border-[#E8C15A]/20'
                        : 'text-white/30 hover:text-white/60 border border-transparent'
                        }`}>
                    {r.label}
                </button>
            ))}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════ */
/* ═══ MAIN COMPONENT ═══════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════ */
export default function AdminPage() {
    const [tab, setTab] = useState<'overview' | 'students' | 'sheets' | 'submissions' | 'leaderboard'>('overview');
    const [timeRange, setTimeRange] = useState('7d');

    // Overview
    const [overview, setOverview] = useState<OverviewData | null>(null);
    const [overviewLoading, setOverviewLoading] = useState(true);

    // Students
    const [users, setUsers] = useState<UserRow[]>([]);
    const [usersPag, setUsersPag] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
    const [usersLoading, setUsersLoading] = useState(false);
    const [userSearch, setUserSearch] = useState('');

    // Sheets
    const [sheets, setSheets] = useState<SheetRow[]>([]);
    const [sheetsLoading, setSheetsLoading] = useState(false);
    const [totalUsers, setTotalUsers] = useState(0);

    // Submissions  
    const [subs, setSubs] = useState<SubRow[]>([]);
    const [subsPag, setSubsPag] = useState<Pagination>({ page: 1, limit: 30, total: 0, totalPages: 0 });
    const [subsLoading, setSubsLoading] = useState(false);

    // Leaderboard
    const [rankings, setRankings] = useState<RankingRow[]>([]);
    const [rankingsLoading, setRankingsLoading] = useState(false);
    const [showShadowBanned, setShowShadowBanned] = useState(false);

    /* ─── fetchers ───────────────────────────────────────── */
    const fetchOverview = useCallback(async (range: string) => {
        setOverviewLoading(true);
        try {
            const r = await fetch(`/api/admin/overview?range=${range}`, { credentials: 'include' });
            const d = await r.json();
            if (d.success) setOverview(d);
        } catch { /* noop */ }
        setOverviewLoading(false);
    }, []);

    const fetchUsers = useCallback(async (page = 1) => {
        setUsersLoading(true);
        try {
            const r = await fetch(`/api/admin/users?page=${page}&limit=20`, { credentials: 'include' });
            const d = await r.json();
            if (d.success) { setUsers(d.users); setUsersPag(d.pagination); }
        } catch { /* noop */ }
        setUsersLoading(false);
    }, []);

    const fetchSheets = useCallback(async () => {
        setSheetsLoading(true);
        try {
            const r = await fetch('/api/admin/sheet-progress', { credentials: 'include' });
            const d = await r.json();
            if (d.success) { setSheets(d.sheets); setTotalUsers(d.totalUsers || 0); }
        } catch { /* noop */ }
        setSheetsLoading(false);
    }, []);

    const fetchSubs = useCallback(async (page = 1) => {
        setSubsLoading(true);
        try {
            const r = await fetch(`/api/admin/submissions?page=${page}&limit=30`, { credentials: 'include' });
            const d = await r.json();
            if (d.success) { setSubs(d.submissions); setSubsPag(d.pagination); }
        } catch { /* noop */ }
        setSubsLoading(false);
    }, []);

    const fetchRankings = useCallback(async (includeAll: boolean) => {
        setRankingsLoading(true);
        try {
            const r = await fetch(`/api/admin/rankings?includeAll=${includeAll}`, { credentials: 'include' });
            const d = await r.json();
            if (d.success) setRankings(d.rankings);
        } catch { /* noop */ }
        setRankingsLoading(false);
    }, []);

    useEffect(() => { fetchOverview(timeRange); }, [timeRange, fetchOverview]);
    useEffect(() => { if (tab === 'students') fetchUsers(); }, [tab, fetchUsers]);
    useEffect(() => { if (tab === 'sheets') fetchSheets(); }, [tab, fetchSheets]);
    useEffect(() => { if (tab === 'submissions') fetchSubs(); }, [tab, fetchSubs]);
    useEffect(() => { if (tab === 'leaderboard') fetchRankings(showShadowBanned); }, [tab, showShadowBanned, fetchRankings]);

    useEffect(() => {
        if (tab !== 'submissions') return;
        const iv = setInterval(() => fetchSubs(subsPag.page), 10000);
        return () => clearInterval(iv);
    }, [tab, subsPag.page, fetchSubs]);

    const filteredUsers = userSearch
        ? users.filter(u => (u.name || '').toLowerCase().includes(userSearch.toLowerCase()) ||
            u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
            (u.codeforcesHandle || '').toLowerCase().includes(userSearch.toLowerCase()))
        : users;

    const tabs = [
        { id: 'overview' as const, label: 'Overview', icon: BarChart3 },
        { id: 'students' as const, label: 'Students', icon: Users },
        { id: 'sheets' as const, label: 'Sheets', icon: BookOpen },
        { id: 'submissions' as const, label: 'Live Feed', icon: Zap },
        { id: 'leaderboard' as const, label: 'Leaderboard', icon: Trophy },
    ];

    const verdictData = overview?.verdictBreakdown.filter(v => v.count > 0) || [];
    const verdictTotal = verdictData.reduce((a, v) => a + v.count, 0);

    const groupedSheets = sheets.reduce((acc, s) => {
        if (!acc[s.levelName]) acc[s.levelName] = [];
        acc[s.levelName].push(s);
        return acc;
    }, {} as Record<string, SheetRow[]>);

    return (
        <div className="space-y-6">
            {/* Tab Bar */}
            <div className="flex items-center gap-1 bg-white/[0.02] border border-white/[0.06] rounded-xl p-1 overflow-x-auto">
                {tabs.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${tab === t.id
                            ? 'bg-[#E8C15A]/10 text-[#E8C15A] border border-[#E8C15A]/20'
                            : 'text-white/30 hover:text-white/60 border border-transparent'
                            }`}>
                        <t.icon size={14} />
                        <span className="hidden sm:inline">{t.label}</span>
                    </button>
                ))}
            </div>

            {/* ═══ OVERVIEW TAB ════════════════════════════════════ */}
            {tab === 'overview' && (
                <div className="space-y-6">
                    {/* Time Range Filter */}
                    <div className="flex items-center justify-between">
                        <TimeRangeFilter value={timeRange} onChange={setTimeRange} />
                        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/20">
                            {RANGE_LABELS[timeRange]}
                        </span>
                    </div>

                    {overviewLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-6 h-6 text-[#E8C15A] animate-spin" />
                        </div>
                    ) : overview && (
                        <div className="space-y-6">
                            {/* ─── BIG METRIC CHARTS ─── */}
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                <MetricChart
                                    title="Total Users"
                                    value={fmt(overview.totalUsers)}
                                    data={overview.totalUsersByDay}
                                    color="gold"
                                    unit="registered"
                                />
                                <MetricChart
                                    title={`Active Users`}
                                    value={fmt(overview.activeUsers)}
                                    data={overview.activeUsersByDay}
                                    color="emerald"
                                    unit={`in ${RANGE_LABELS[timeRange].toLowerCase()}`}
                                />
                                <MetricChart
                                    title="New Users"
                                    value={fmt(overview.newUsers)}
                                    data={overview.newUsersByDay}
                                    color="blue"
                                    unit={`in ${RANGE_LABELS[timeRange].toLowerCase()}`}
                                />
                                <MetricChart
                                    title="Submissions"
                                    value={fmt(overview.totalSubmissions)}
                                    data={overview.submissionsByDay}
                                    color="purple"
                                    unit={`in ${RANGE_LABELS[timeRange].toLowerCase()}`}
                                />
                                <MetricChart
                                    title="Today's Submissions"
                                    value={fmt(overview.submissionsToday)}
                                    data={overview.submissionsByDay}
                                    color="orange"
                                    unit="today"
                                />
                                <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 hover:border-white/10 transition-all flex flex-col justify-between">
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30">Pending Applications</p>
                                        <p className="text-3xl font-black tracking-tight text-rose-400 mt-1">{fmt(overview.appsPendingAccount)}</p>
                                        <p className="text-[10px] text-white/20 mt-0.5">awaiting account creation</p>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-white/[0.04] grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-lg font-bold text-white">{fmt(overview.shadowBannedCount)}</p>
                                            <p className="text-[9px] text-white/25 uppercase font-bold tracking-wider">Shadow Banned</p>
                                        </div>
                                        <div>
                                            <p className="text-lg font-bold text-white">{fmt(overview.totalUsers)}</p>
                                            <p className="text-[9px] text-white/25 uppercase font-bold tracking-wider">Total Accounts</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ─── VERDICT + TOP SHEETS ─── */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                {/* Donut — Verdict Breakdown */}
                                <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
                                    <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-white/40 mb-4">
                                        Verdict Breakdown
                                    </h3>
                                    <div className="h-[180px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={verdictData} dataKey="count" nameKey="verdict"
                                                    cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} strokeWidth={0}>
                                                    {verdictData.map((_, i) => (
                                                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(v: number, name: string) => [`${v} (${((v / verdictTotal) * 100).toFixed(1)}%)`, name]} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="space-y-1.5 mt-2">
                                        {verdictData.slice(0, 5).map((v, i) => (
                                            <div key={v.verdict} className="flex items-center justify-between text-[10px]">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                                                    <span className="text-white/50">{v.verdict}</span>
                                                </div>
                                                <span className="text-white/70 font-bold">{fmt(v.count)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Top Sheets Bar */}
                                <div className="lg:col-span-2 bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
                                    <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-white/40 mb-4">
                                        Most Active Sheets
                                    </h3>
                                    <div className="h-[240px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={overview.topSheets.slice(0, 8)} layout="vertical">
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                                                <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                                                <YAxis type="category" dataKey="name" width={120}
                                                    tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} axisLine={false} tickLine={false} />
                                                <Tooltip />
                                                <Bar dataKey="activity" fill={GOLD} radius={[0, 4, 4, 0]} barSize={16} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ═══ STUDENTS TAB ════════════════════════════════════ */}
            {tab === 'students' && (
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="relative flex-1 max-w-md">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                            <input value={userSearch} onChange={e => setUserSearch(e.target.value)}
                                placeholder="Search by name, email, or CF handle..."
                                className="w-full pl-9 pr-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#E8C15A]/30" />
                        </div>
                        <button onClick={() => fetchUsers(usersPag.page)}
                            className="p-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white/40 hover:text-white transition-colors">
                            <RefreshCw size={14} className={usersLoading ? 'animate-spin' : ''} />
                        </button>
                    </div>

                    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-white/[0.06]">
                                        {['Name', 'Email', 'Faculty', 'Solved', 'Subs', 'CF Handle', 'Last Login', 'Status'].map(h => (
                                            <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.15em] text-white/30">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {usersLoading ? (
                                        <tr><td colSpan={8} className="text-center py-10">
                                            <Loader2 className="w-5 h-5 text-[#E8C15A] animate-spin mx-auto" />
                                        </td></tr>
                                    ) : filteredUsers.map(u => (
                                        <tr key={u.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                                            <td className="px-4 py-3 text-sm text-white font-medium">{u.name || '—'}</td>
                                            <td className="px-4 py-3 text-xs text-white/50 font-mono">{u.email}</td>
                                            <td className="px-4 py-3 text-xs text-white/40 capitalize">{u.faculty || '—'}</td>
                                            <td className="px-4 py-3"><span className="text-sm font-bold text-emerald-400">{u.solvedCount}</span></td>
                                            <td className="px-4 py-3 text-xs text-white/50">{u.totalSubmissions}</td>
                                            <td className="px-4 py-3 text-xs text-blue-400 font-mono">{u.codeforcesHandle || '—'}</td>
                                            <td className="px-4 py-3 text-[10px] text-white/30">{timeAgo(u.lastLoginAt)}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1.5">
                                                    {u.isVerified && <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[9px] font-bold">✓</span>}
                                                    {u.isShadowBanned && <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 text-[9px] font-bold">BAN</span>}
                                                    {u.cheatingFlags > 0 && (
                                                        <span className="px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 text-[9px] font-bold flex items-center gap-0.5">
                                                            <AlertTriangle size={8} />{u.cheatingFlags}
                                                        </span>
                                                    )}
                                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${u.role === 'owner' ? 'bg-[#E8C15A]/10 text-[#E8C15A]' :
                                                        u.role === 'instructor' ? 'bg-purple-500/10 text-purple-400' : 'bg-white/5 text-white/30'}`}>
                                                        {u.role}
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
                            <p className="text-[10px] text-white/30">
                                Showing {(usersPag.page - 1) * usersPag.limit + 1}–{Math.min(usersPag.page * usersPag.limit, usersPag.total)} of {usersPag.total}
                            </p>
                            <div className="flex items-center gap-1">
                                <button disabled={usersPag.page <= 1} onClick={() => fetchUsers(usersPag.page - 1)}
                                    className="p-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white/40 disabled:opacity-30 hover:text-white">
                                    <ChevronLeft size={14} />
                                </button>
                                <span className="px-3 text-xs text-white/50">{usersPag.page} / {usersPag.totalPages}</span>
                                <button disabled={usersPag.page >= usersPag.totalPages} onClick={() => fetchUsers(usersPag.page + 1)}
                                    className="p-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white/40 disabled:opacity-30 hover:text-white">
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ SHEETS TAB ══════════════════════════════════════ */}
            {tab === 'sheets' && (
                sheetsLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-6 h-6 text-[#E8C15A] animate-spin" />
                    </div>
                ) : (
                    <div className="space-y-8">
                        {Object.entries(groupedSheets).map(([level, levelSheets]) => (
                            <div key={level}>
                                <h3 className="text-sm font-bold text-white/60 mb-4 flex items-center gap-2">
                                    <Trophy size={14} className="text-[#E8C15A]" />
                                    {level}
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                    {levelSheets.map(s => {
                                        const pct = s.totalProblems > 0 ? (s.uniqueProblemsSolved / s.totalProblems) * 100 : 0;
                                        return (
                                            <div key={s.id} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 hover:border-white/10 transition-all">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-bold text-white truncate">{s.name}</p>
                                                        <p className="text-[10px] text-white/30 mt-0.5">
                                                            {s.uniqueProblemsSolved}/{s.totalProblems} problems solved
                                                        </p>
                                                    </div>
                                                    <CircularProgress pct={pct} size={48} />
                                                </div>
                                                <div className="mb-3 px-2.5 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                                                    <p className="text-[10px] text-white/40">
                                                        <span className={`font-bold ${s.fullCompletions > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                            {s.fullCompletions}
                                                        </span>
                                                        <span className="text-white/20"> / </span>
                                                        <span className="font-bold text-white/50">{totalUsers}</span>
                                                        <span className="text-white/25"> users completed full sheet</span>
                                                    </p>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/[0.04]">
                                                    <div>
                                                        <p className="text-xs font-bold text-white">{s.usersSolved}</p>
                                                        <p className="text-[9px] text-white/25 uppercase">Students</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-white">{fmt(s.totalSolves)}</p>
                                                        <p className="text-[9px] text-white/25 uppercase">Solves</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-white">
                                                            {s.avgTimeSeconds ? Math.round(s.avgTimeSeconds / 60) + 'm' : '—'}
                                                        </p>
                                                        <p className="text-[9px] text-white/25 uppercase">Avg Time</p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}

            {/* ═══ SUBMISSIONS TAB ═════════════════════════════════ */}
            {tab === 'submissions' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/40">Live — Auto-refreshes every 10s</span>
                        </div>
                        <button onClick={() => fetchSubs(subsPag.page)}
                            className="p-2 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white/40 hover:text-white transition-colors">
                            <RefreshCw size={14} className={subsLoading ? 'animate-spin' : ''} />
                        </button>
                    </div>

                    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-white/[0.06]">
                                        {['Student', 'Sheet', 'Problem', 'Verdict', 'Time', 'Memory', 'Lang', 'Source', 'When'].map(h => (
                                            <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.15em] text-white/30">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {subsLoading ? (
                                        <tr><td colSpan={9} className="text-center py-10">
                                            <Loader2 className="w-5 h-5 text-[#E8C15A] animate-spin mx-auto" />
                                        </td></tr>
                                    ) : subs.map(s => (
                                        <tr key={`${s.source}-${s.id}`} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                                            <td className="px-4 py-2.5 text-xs text-white font-medium">{s.userName || '—'}</td>
                                            <td className="px-4 py-2.5 text-[10px] text-white/40 max-w-[120px] truncate">{s.sheetName || '—'}</td>
                                            <td className="px-4 py-2.5 text-[10px] text-white/50 font-mono">{s.problemId}</td>
                                            <td className="px-4 py-2.5"><VerdictBadge verdict={s.verdict} /></td>
                                            <td className="px-4 py-2.5 text-[10px] text-white/40">{s.timeMs ? s.timeMs + 'ms' : '—'}</td>
                                            <td className="px-4 py-2.5 text-[10px] text-white/40">{s.memoryKb ? Math.round(s.memoryKb / 1024) + 'MB' : '—'}</td>
                                            <td className="px-4 py-2.5 text-[10px] text-white/40">{s.language || '—'}</td>
                                            <td className="px-4 py-2.5">
                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${s.source === 'codeforces' ? 'bg-blue-500/10 text-blue-400' : 'bg-[#E8C15A]/10 text-[#E8C15A]'}`}>
                                                    {s.source === 'codeforces' ? 'CF' : 'J0'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2.5 text-[10px] text-white/30">{timeAgo(s.submittedAt)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
                            <p className="text-[10px] text-white/30">{fmt(subsPag.total)} total submissions</p>
                            <div className="flex items-center gap-1">
                                <button disabled={subsPag.page <= 1} onClick={() => fetchSubs(subsPag.page - 1)}
                                    className="p-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white/40 disabled:opacity-30 hover:text-white">
                                    <ChevronLeft size={14} />
                                </button>
                                <span className="px-3 text-xs text-white/50">{subsPag.page} / {subsPag.totalPages}</span>
                                <button disabled={subsPag.page >= subsPag.totalPages} onClick={() => fetchSubs(subsPag.page + 1)}
                                    className="p-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white/40 disabled:opacity-30 hover:text-white">
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ LEADERBOARD TAB ═════════════════════════════════ */}
            {tab === 'leaderboard' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-white/40">Top Solvers</h3>
                            <span className="text-[10px] text-white/20">{rankings.length} users</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setShowShadowBanned(!showShadowBanned)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${showShadowBanned
                                    ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                    : 'bg-white/[0.03] text-white/30 border-white/[0.06] hover:text-white/60'
                                    }`}>
                                {showShadowBanned ? <Eye size={12} /> : <EyeOff size={12} />}
                                {showShadowBanned ? 'Showing All' : 'Clean Only'}
                            </button>
                            <button onClick={() => fetchRankings(showShadowBanned)}
                                className="p-2 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white/40 hover:text-white transition-colors">
                                <RefreshCw size={14} className={rankingsLoading ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>

                    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-white/[0.06]">
                                        {['#', 'Name', 'Faculty', 'CF Handle', 'Solved', 'Submissions', 'Status'].map(h => (
                                            <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.15em] text-white/30">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rankingsLoading ? (
                                        <tr><td colSpan={7} className="text-center py-10">
                                            <Loader2 className="w-5 h-5 text-[#E8C15A] animate-spin mx-auto" />
                                        </td></tr>
                                    ) : rankings.map((r, i) => (
                                        <tr key={r.userId} className={`border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors ${r.isShadowBanned ? 'opacity-60' : ''}`}>
                                            <td className="px-4 py-3">
                                                {i < 3 ? (
                                                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${i === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-600 text-black' :
                                                        i === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-black' :
                                                            'bg-gradient-to-br from-orange-400 to-orange-700 text-black'
                                                        }`}>{i + 1}</span>
                                                ) : (
                                                    <span className="text-sm font-bold text-white/30 pl-1.5">{i + 1}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3"><span className="text-sm font-medium text-white">{r.name}</span></td>
                                            <td className="px-4 py-3 text-xs text-white/40 capitalize">{r.faculty || '—'}</td>
                                            <td className="px-4 py-3 text-xs text-blue-400 font-mono">{r.codeforcesHandle || '—'}</td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${r.solved >= 20 ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-400' :
                                                    r.solved >= 10 ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400' :
                                                        r.solved >= 5 ? 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-400' :
                                                            'bg-white/5 text-white/50'
                                                    }`}>{r.solved}</span>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-white/50">{r.totalSubmissions}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1.5">
                                                    {r.isShadowBanned && (
                                                        <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 text-[9px] font-bold flex items-center gap-0.5">
                                                            <Shield size={8} /> BAN
                                                        </span>
                                                    )}
                                                    {r.cheatingFlags > 0 && (
                                                        <span className="px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 text-[9px] font-bold flex items-center gap-0.5">
                                                            <AlertTriangle size={8} /> {r.cheatingFlags}
                                                        </span>
                                                    )}
                                                    {!r.isShadowBanned && r.cheatingFlags === 0 && (
                                                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[9px] font-bold">Clean</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {rankings.length > 0 && (
                            <div className="px-4 py-3 border-t border-white/[0.06]">
                                <p className="text-[10px] text-white/20">
                                    Top {rankings.length} users by unique problems solved{showShadowBanned && ' (including shadow-banned)'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
