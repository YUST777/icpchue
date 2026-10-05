'use client';

import React, { useMemo, useState } from 'react';
import { Timer, Target, AlertTriangle, Turtle, Layers, History, CheckCircle2, XCircle, type LucideIcon } from 'lucide-react';

export interface ProblemTime {
    key: string;
    contest_id: string;
    problem_index: string;
    label: string;
    sheet_key: string;
    sheet_name: string | null;
    title: string | null;
    active_seconds: number;
    idle_seconds: number;
    away_seconds: number;
    visits: number;
    first_seen: string;
    last_seen: string;
    solved: boolean;
    first_ac_at: string | null;
    active_to_solve_seconds: number | null;
    attempts: number;
    latest_verdict: string | null;
}

export interface TimeSession {
    contest_id: string;
    problem_index: string;
    label: string;
    title: string | null;
    started_at: string;
    ended_at: string;
    active_seconds: number;
    idle_seconds: number;
    away_seconds: number;
}

type Horizon = 'all' | '24h' | '7d' | '30d' | '90d';

// Unsolved after this much active work, or solved only after this much.
const STRUGGLE_UNSOLVED_S = 20 * 60;
const SLOW_SOLVE_S = 45 * 60;
const HORIZON_MS: Record<Exclude<Horizon, 'all'>, number> = {
    '24h': 864e5, '7d': 7 * 864e5, '30d': 30 * 864e5, '90d': 90 * 864e5,
};

export function formatDuration(totalSeconds: number): string {
    const s = Math.max(0, Math.round(totalSeconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (h > 0) return m ? `${h}h ${m}m` : `${h}h`;
    if (m > 0) return `${m}m`;
    return `${s}s`;
}

function formatWhen(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function SplitBar({ active, idle, away }: { active: number; idle: number; away: number }) {
    const total = active + idle + away || 1;
    return (
        <div className="flex h-1.5 w-full rounded-full overflow-hidden bg-white/[0.06]" title={`Active ${formatDuration(active)} · Idle ${formatDuration(idle)} · Away ${formatDuration(away)}`}>
            <div className="bg-[#E8C15A]" style={{ width: `${(active / total) * 100}%` }} />
            <div className="bg-white/25" style={{ width: `${(idle / total) * 100}%` }} />
            <div className="bg-white/10" style={{ width: `${(away / total) * 100}%` }} />
        </div>
    );
}

function Card({ icon: Icon, label, value, hint }: { icon: LucideIcon; label: string; value: string; hint?: string }) {
    return (
        <div className="bg-[#121214]/90 border border-white/[0.08] rounded-2xl p-4">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-white/40 font-mono">
                <Icon size={12} className="text-[#E8C15A]" /> {label}
            </div>
            <div className="mt-1.5 text-xl font-bold text-white tabular-nums">{value}</div>
            {hint && <div className="text-[11px] text-white/40 mt-0.5">{hint}</div>}
        </div>
    );
}

export function ProblemTimeView({ problems, sessions, timeHorizon }: {
    problems: ProblemTime[];
    sessions: TimeSession[];
    timeHorizon: Horizon;
}) {
    const [showAll, setShowAll] = useState(false);

    const stats = useMemo(() => {
        const active = problems.reduce((a, p) => a + p.active_seconds, 0);
        const idle = problems.reduce((a, p) => a + p.idle_seconds, 0);
        const away = problems.reduce((a, p) => a + p.away_seconds, 0);
        const solvedTimes = problems.filter((p) => p.active_to_solve_seconds != null).map((p) => p.active_to_solve_seconds as number);
        const avgSolve = solvedTimes.length ? solvedTimes.reduce((a, b) => a + b, 0) / solvedTimes.length : 0;
        return { active, idle, away, avgSolve, solvedCount: solvedTimes.length };
    }, [problems]);

    const flagged = useMemo(() => problems
        .map((p) => {
            if (!p.solved && p.active_seconds >= STRUGGLE_UNSOLVED_S) return { ...p, reason: 'struggling' as const };
            if (p.solved && (p.active_to_solve_seconds ?? 0) >= SLOW_SOLVE_S) return { ...p, reason: 'slow' as const };
            return null;
        })
        .filter((p): p is ProblemTime & { reason: 'struggling' | 'slow' } => p !== null)
        .sort((a, b) => b.active_seconds - a.active_seconds), [problems]);

    const topics = useMemo(() => {
        const bySheet = new Map<string, { key: string; name: string | null; active: number; unsolvedActive: number; solved: number; unsolved: number; solveTimes: number[] }>();
        for (const p of problems) {
            const t = bySheet.get(p.sheet_key) || { key: p.sheet_key, name: p.sheet_name, active: 0, unsolvedActive: 0, solved: 0, unsolved: 0, solveTimes: [] };
            t.active += p.active_seconds;
            if (p.solved) {
                t.solved++;
                if (p.active_to_solve_seconds != null) t.solveTimes.push(p.active_to_solve_seconds);
            } else {
                t.unsolved++;
                t.unsolvedActive += p.active_seconds;
            }
            bySheet.set(p.sheet_key, t);
        }
        return [...bySheet.values()]
            .map((t) => ({ ...t, avgSolve: t.solveTimes.length ? t.solveTimes.reduce((a, b) => a + b, 0) / t.solveTimes.length : null }))
            // Most time sunk into unsolved problems first, then slowest average solve.
            .sort((a, b) => (b.unsolvedActive - a.unsolvedActive) || ((b.avgSolve ?? 0) - (a.avgSolve ?? 0)));
    }, [problems]);

    const visibleSessions = useMemo(() => {
        if (timeHorizon === 'all') return sessions;
        const since = Date.now() - HORIZON_MS[timeHorizon];
        return sessions.filter((s) => new Date(s.started_at).getTime() >= since);
    }, [sessions, timeHorizon]);

    if (!problems.length) {
        return (
            <div className="bg-[#121214]/90 border border-white/[0.08] rounded-2xl p-8 text-center">
                <Timer size={28} className="mx-auto text-white/20 mb-2" />
                <p className="text-sm font-semibold text-white">No timing data yet</p>
                <p className="text-xs text-white/40 mt-1">Time is recorded from now on whenever this trainee opens a problem.</p>
            </div>
        );
    }

    const allSorted = [...problems].sort((a, b) => b.active_seconds - a.active_seconds);
    const focus = stats.active / ((stats.active + stats.idle + stats.away) || 1);

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Card icon={Timer} label="Active time" value={formatDuration(stats.active)} hint={`on ${problems.length} problems`} />
                <Card icon={Target} label="Focus" value={`${Math.round(focus * 100)}%`} hint={`idle ${formatDuration(stats.idle)} · away ${formatDuration(stats.away)}`} />
                <Card icon={CheckCircle2} label="Avg time to solve" value={stats.solvedCount ? formatDuration(stats.avgSolve) : '—'} hint={`${stats.solvedCount} timed solves`} />
                <Card icon={AlertTriangle} label="Needs help" value={String(flagged.filter((p) => p.reason === 'struggling').length)} hint={`${flagged.filter((p) => p.reason === 'slow').length} slow solves`} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                {/* Where they struggle */}
                <div className="lg:col-span-7 bg-[#121214]/90 border border-white/[0.08] rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                            <AlertTriangle size={14} className="text-amber-400" /> Where they struggle
                        </h3>
                        <button type="button" onClick={() => setShowAll((v) => !v)} className="text-[11px] text-white/50 hover:text-white">
                            {showAll ? 'Only problem spots' : 'All problems'}
                        </button>
                    </div>
                    <div className="space-y-2">
                        {(showAll ? allSorted : flagged).length === 0 && (
                            <p className="text-xs text-white/40 py-4 text-center">
                                Nothing stands out: no unsolved problem over {STRUGGLE_UNSOLVED_S / 60}m and no solve over {SLOW_SOLVE_S / 60}m.
                            </p>
                        )}
                        {(showAll ? allSorted : flagged).map((p) => {
                            const reason = 'reason' in p ? (p as { reason: string }).reason : (p.solved ? 'solved' : 'unsolved');
                            return (
                                <div key={p.key} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="text-xs font-semibold text-white truncate">{p.label}{p.title ? ` · ${p.title}` : ''}</div>
                                            <div className="text-[11px] text-white/40 mt-0.5">
                                                {p.visits} visit{p.visits === 1 ? '' : 's'} · {p.attempts} submission{p.attempts === 1 ? '' : 's'}
                                                {p.latest_verdict && !p.solved ? ` · last: ${p.latest_verdict}` : ''}
                                                {p.active_to_solve_seconds != null ? ` · solved after ${formatDuration(p.active_to_solve_seconds)} active` : ''}
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <div className="text-sm font-bold text-[#E8C15A] tabular-nums">{formatDuration(p.active_seconds)}</div>
                                            <span className={`text-[10px] font-mono uppercase ${
                                                reason === 'struggling' || reason === 'unsolved' ? 'text-red-400' : reason === 'slow' ? 'text-amber-400' : 'text-emerald-400'
                                            }`}>
                                                {reason === 'struggling' ? 'Stuck' : reason === 'slow' ? 'Slow solve' : reason}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mt-2"><SplitBar active={p.active_seconds} idle={p.idle_seconds} away={p.away_seconds} /></div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Weak topics */}
                <div className="lg:col-span-5 bg-[#121214]/90 border border-white/[0.08] rounded-2xl p-4">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
                        <Layers size={14} className="text-[#E8C15A]" /> Time by sheet
                    </h3>
                    <div className="space-y-2.5">
                        {topics.map((t) => (
                            <div key={t.key}>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-white/80 truncate">{t.key}{t.name ? ` · ${t.name}` : ''}</span>
                                    <span className="text-white tabular-nums font-semibold">{formatDuration(t.active)}</span>
                                </div>
                                <div className="text-[11px] text-white/40 mt-0.5 flex items-center gap-2">
                                    <span className="flex items-center gap-1"><CheckCircle2 size={10} className="text-emerald-400" />{t.solved}</span>
                                    <span className="flex items-center gap-1"><XCircle size={10} className="text-red-400" />{t.unsolved}</span>
                                    {t.avgSolve != null && <span className="flex items-center gap-1"><Turtle size={10} />avg {formatDuration(t.avgSolve)}/solve</span>}
                                    {t.unsolvedActive > 0 && <span className="text-red-400/80">{formatDuration(t.unsolvedActive)} unsolved</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Session timeline */}
            <div className="bg-[#121214]/90 border border-white/[0.08] rounded-2xl p-4">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
                    <History size={14} className="text-[#E8C15A]" /> Sessions
                    <span className="text-[10px] font-mono text-white/40">{timeHorizon === 'all' ? 'latest 200' : timeHorizon}</span>
                </h3>
                {visibleSessions.length === 0 ? (
                    <p className="text-xs text-white/40 py-3 text-center">No sessions in this time window.</p>
                ) : (
                    <div className="divide-y divide-white/[0.05]">
                        {visibleSessions.map((s, i) => (
                            <div key={`${s.started_at}_${i}`} className="py-2 grid grid-cols-12 gap-2 items-center text-xs">
                                <div className="col-span-12 sm:col-span-3 text-white/50 tabular-nums">
                                    {formatWhen(s.started_at)} → {new Date(s.ended_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                <div className="col-span-12 sm:col-span-5 text-white/85 truncate">{s.label}{s.title ? ` · ${s.title}` : ''}</div>
                                <div className="col-span-12 sm:col-span-4 flex items-center gap-2">
                                    <span className="text-[#E8C15A] font-semibold tabular-nums w-14">{formatDuration(s.active_seconds)}</span>
                                    <div className="flex-1"><SplitBar active={s.active_seconds} idle={s.idle_seconds} away={s.away_seconds} /></div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                <div className="mt-3 flex items-center gap-3 text-[10px] text-white/40">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#E8C15A]" />Active</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-white/25" />Idle (90s+ no input)</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-white/10" />Away (other tab)</span>
                </div>
            </div>
        </div>
    );
}
