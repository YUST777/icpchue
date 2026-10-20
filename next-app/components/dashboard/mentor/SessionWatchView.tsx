'use client';

import React, { useMemo } from 'react';
import { PlayCircle, Eye, Clock, Percent, type LucideIcon } from 'lucide-react';
import { camps, CURRENT_SEASON } from '@/lib/sessionData';
import { formatDuration } from './ProblemTimeView';

export interface SessionWatchRow {
    camp_slug: string;
    session_slug: string;
    watched_seconds: number;
    page_seconds: number;
    duration_seconds: number | null;
    max_position_seconds: number;
    coverage_pct: number | null;
    slides_seen: number;
    plays: number;
    first_seen_at: string;
    last_seen_at: string;
}

function formatWhen(iso: string): string {
    return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
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

/** Recorded sessions of the current season: what the trainee watched, how much, and what they skipped. */
export function SessionWatchView({ rows }: { rows: SessionWatchRow[] }) {
    const list = useMemo(() => {
        const byKey = new Map(rows.map((r) => [`${r.camp_slug}/${r.session_slug}`, r]));
        return camps
            .filter((c) => c.season === CURRENT_SEASON && c.dashboardVisible !== false)
            .flatMap((c) => c.sessions.map((s) => ({
                key: `${c.slug}/${s.slug}`,
                camp: c.title,
                number: s.displayNumber,
                title: s.title,
                hasVideo: Boolean(s.videoId),
                row: byKey.get(`${c.slug}/${s.slug}`) || null,
            })));
    }, [rows]);

    const opened = list.filter((s) => s.row).length;
    const totalWatched = list.reduce((sum, s) => sum + (s.row?.watched_seconds || 0), 0);
    const coverages = list.filter((s) => s.hasVideo).map((s) => s.row?.coverage_pct ?? 0);
    const avgCoverage = coverages.length ? Math.round(coverages.reduce((a, b) => a + b, 0) / coverages.length) : 0;

    if (list.length === 0) {
        return <p className="text-xs text-white/40 p-4">No recorded sessions for Season {CURRENT_SEASON} yet.</p>;
    }

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Card icon={Eye} label="Sessions opened" value={`${opened} / ${list.length}`} hint={`Season ${CURRENT_SEASON}`} />
                <Card icon={PlayCircle} label="Video watched" value={formatDuration(totalWatched)} hint="Playing, tab visible" />
                <Card icon={Percent} label="Avg. coverage" value={`${avgCoverage}%`} hint="Share of each video played" />
                <Card icon={Clock} label="Time on pages" value={formatDuration(list.reduce((sum, s) => sum + (s.row?.page_seconds || 0), 0))} />
            </div>

            <div className="bg-[#121214]/90 border border-white/[0.08] rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="text-left text-[10px] uppercase tracking-wider text-white/40 font-mono border-b border-white/[0.06]">
                                <th className="px-4 py-3 min-w-[220px]">Session</th>
                                <th className="px-4 py-3">Watched</th>
                                <th className="px-4 py-3 min-w-[140px]">Coverage</th>
                                <th className="px-4 py-3">Furthest point</th>
                                <th className="px-4 py-3">Slides</th>
                                <th className="px-4 py-3">Plays</th>
                                <th className="px-4 py-3">Last watched</th>
                            </tr>
                        </thead>
                        <tbody>
                            {list.map(({ key, camp, number, title, hasVideo, row }) => (
                                <tr key={key} className="border-b border-white/[0.04] last:border-0">
                                    <td className="px-4 py-3">
                                        <div className="font-semibold text-white/90">{number}. {title}</div>
                                        <div className="text-[10px] text-white/35">{camp}</div>
                                    </td>
                                    {!row ? (
                                        <td colSpan={6} className="px-4 py-3 text-red-400/80 font-medium">Not opened</td>
                                    ) : (
                                        <>
                                            <td className="px-4 py-3 tabular-nums text-white/80">{formatDuration(row.watched_seconds)}</td>
                                            <td className="px-4 py-3">
                                                {hasVideo && row.coverage_pct !== null ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                                                            <div className={`h-full ${row.coverage_pct >= 80 ? 'bg-green-500' : row.coverage_pct >= 40 ? 'bg-[#E8C15A]' : 'bg-red-500'}`} style={{ width: `${row.coverage_pct}%` }} />
                                                        </div>
                                                        <span className="tabular-nums text-white/70 w-9 text-right">{row.coverage_pct}%</span>
                                                    </div>
                                                ) : <span className="text-white/30">{hasVideo ? 'Not played' : 'No video'}</span>}
                                            </td>
                                            <td className="px-4 py-3 tabular-nums text-white/60">
                                                {row.duration_seconds ? `${formatDuration(row.max_position_seconds)} / ${formatDuration(row.duration_seconds)}` : '—'}
                                            </td>
                                            <td className="px-4 py-3 tabular-nums text-white/60">{row.slides_seen || '—'}</td>
                                            <td className="px-4 py-3 tabular-nums text-white/60">{row.plays}</td>
                                            <td className="px-4 py-3 text-white/50 whitespace-nowrap">{formatWhen(row.last_seen_at)}</td>
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <p className="text-[11px] text-white/35">
                Watched counts only while the video is playing with the tab visible. Coverage is the share of 10-second parts actually played, so skipping ahead does not raise it.
            </p>
        </div>
    );
}
