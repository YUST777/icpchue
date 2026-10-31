'use client';

import React from 'react';
import { CalendarCheck, CheckCircle2, XCircle, PlayCircle, MinusCircle } from 'lucide-react';
import type { SessionWatchRow } from './SessionWatchView';

export interface AttendanceRow {
    session_key: string;       // '<camp_slug>/<session_slug>', same as the recording
    label: string;
    held_on: string;
    meeting_minutes: number;
    attended: boolean;
    minutes: number;
    first_join: string | null;
    last_leave: string | null;
    matched_by: 'student ID' | 'name' | null;
}

const CAIRO = 'Africa/Cairo';
const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: CAIRO });
const clock = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: CAIRO });
const mins = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`);

function Pill({ ok, partial, children }: { ok: boolean; partial?: boolean; children: React.ReactNode }) {
    const tone = ok ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25' : partial ? 'text-amber-300 bg-amber-500/10 border-amber-500/25' : 'text-red-400 bg-red-500/10 border-red-500/25';
    const Icon = ok ? CheckCircle2 : partial ? MinusCircle : XCircle;
    return <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${tone}`}><Icon size={12} />{children}</span>;
}

/** Per live session: did they join (and for how long), and did they watch the recording on the site. */
export function AttendanceView({ attendance, watch }: { attendance: AttendanceRow[]; watch: SessionWatchRow[] }) {
    if (attendance.length === 0) return <p className="text-xs text-white/40 p-4">No attendance lists have been loaded yet.</p>;
    const byKey = new Map(watch.map(w => [`${w.camp_slug}/${w.session_slug}`, w]));
    const rows = attendance.map(a => {
        const w = byKey.get(a.session_key) || null;
        const watchedMin = w ? Math.round(w.watched_seconds / 60) : 0;
        const coverage = w?.coverage_pct ?? 0;
        // "Watched" means a real part of the video was played, not just the page opened.
        const watched = Boolean(w) && (coverage >= 25 || watchedMin >= 10);
        const present = a.attended ? Math.min(100, Math.round((a.minutes / a.meeting_minutes) * 100)) : 0;
        return { a, w, watchedMin, coverage, watched, present, followed: a.attended || watched };
    });
    const followedCount = rows.filter(r => r.followed).length;

    return (
        <div className="space-y-4">
            <div className="bg-[#121214]/90 border border-white/[0.08] rounded-2xl p-4 flex items-center gap-3">
                <CalendarCheck size={18} className="text-[#E8C15A] shrink-0" />
                <div>
                    <div className="text-sm font-semibold text-white">Followed {followedCount} of {rows.length} sessions</div>
                    <div className="text-[11px] text-white/45 mt-0.5">A session counts when they joined it live or played a real part of its recording on the website.</div>
                </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
                {rows.map(({ a, w, watchedMin, coverage, watched, present }) => (
                    <div key={a.session_key} className="bg-[#121214]/90 border border-white/[0.08] rounded-2xl p-4 space-y-4">
                        <div>
                            <div className="text-sm font-semibold text-white">{a.label}</div>
                            <div className="text-[11px] text-white/40 mt-0.5">{day(a.held_on)}</div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-[10px] uppercase tracking-wider text-white/40 font-mono">Live session</span>
                                <Pill ok={a.attended && present >= 50} partial={a.attended && present < 50}>{a.attended ? (present >= 50 ? 'Attended' : 'Joined briefly') : 'Did not attend'}</Pill>
                            </div>
                            {a.attended ? (
                                <>
                                    <div className="h-1.5 rounded-full bg-white/[0.07] overflow-hidden"><div className="h-full rounded-full bg-emerald-400" style={{ width: `${present}%` }} /></div>
                                    <div className="text-[11px] text-white/55">
                                        {mins(a.minutes)} of {mins(a.meeting_minutes)} ({present}%)
                                        {a.first_join && a.last_leave && <> · in at {clock(a.first_join)}, out at {clock(a.last_leave)}</>}
                                    </div>
                                    {a.matched_by === 'name' && <div className="text-[10px] text-amber-300/70">Found by name, not by student ID.</div>}
                                </>
                            ) : (
                                <div className="text-[11px] text-white/40">Not in the attendance list (no ID or matching name).</div>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-[10px] uppercase tracking-wider text-white/40 font-mono flex items-center gap-1.5"><PlayCircle size={11} className="text-[#E8C15A]" />Recording on the site</span>
                                <Pill ok={watched} partial={Boolean(w) && !watched}>{watched ? 'Watched' : w ? 'Opened only' : 'Not watched'}</Pill>
                            </div>
                            {w ? (
                                <div className="text-[11px] text-white/55">
                                    Played {mins(watchedMin)}{w.duration_seconds ? ` of ${mins(Math.round(w.duration_seconds / 60))}` : ''} · coverage {coverage}% · {w.plays} play{w.plays === 1 ? '' : 's'}
                                </div>
                            ) : (
                                <div className="text-[11px] text-white/40">Never opened the session page.</div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
