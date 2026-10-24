'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Check, Lock, X } from 'lucide-react';

interface DisciplineLog {
    id?: number;
    user_id: number;
    week_number: number;
    day_number: number;
    log_date: string;
    total_hours: number | string | null;
    is_missed: boolean;
    done_tasks: string;
    student_comment: string;
    mentor_comment?: string;
    mentor_id?: number;
    mentor_name?: string;
    updated_at?: string;
    submitted_at?: string;
}

interface DisciplineTrackerProps {
    targetUserId?: number;
    isMentorView?: boolean;
    traineeName?: string;
}

const TOTAL_WEEKS = 8;
const DAYS_PER_WEEK = 7;
// Program start date: September 8, 2026 (starts at 8/Sep)
const PROGRAM_START_DATE = new Date(2026, 8, 8, 0, 0, 0);

// ── TimeInputCell ──────────────────────────────────────────
function TimeInputCell({
    value,
    onSave,
}: {
    value: number | string | null | undefined;
    onSave: (hours: number | null) => void;
}) {
    const [text, setText] = useState<string>(() => (value != null && value !== '' ? String(value) : ''));
    const debounceRef = React.useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const ext = value != null && value !== '' ? String(value) : '';
        if (text !== ext && (value !== (text === '' ? null : parseFloat(text)))) setText(ext);
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (val === '' || /^[0-9]*\.?[0-9]*$/.test(val)) {
            setText(val);
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => {
                if (val === '' || val === '.') { onSave(null); }
                else { const p = parseFloat(val); if (!isNaN(p) && p >= 0) onSave(Math.min(24, p)); }
            }, 300);
        }
    };

    const handleBlur = () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (text === '' || text === '.') { onSave(null); setText(''); }
        else {
            const p = parseFloat(text);
            if (!isNaN(p) && p >= 0) { const c = Math.min(24, p); onSave(c); setText(String(c)); }
            else { onSave(null); setText(''); }
        }
    };

    return (
        <input
            type="text" inputMode="decimal" value={text} placeholder=""
            onChange={handleChange} onBlur={handleBlur}
            aria-label="Hours" className="w-14 h-8 bg-white/[0.04] border border-white/[0.08] rounded-lg text-center text-sm tabular-nums text-white placeholder-white/20 focus:border-[#E8C15A]/60 focus:outline-none transition-colors"
        />
    );
}

// ── Helpers ────────────────────────────────────────────────
function getDayDate(week: number, day: number) {
    const offset = (week - 1) * 7 + (day - 1);
    return new Date(PROGRAM_START_DATE.getTime() + offset * 86400000);
}
function formatDayDate(d: Date) {
    return `${d.getDate()}/${d.toLocaleString('en-US', { month: 'short' })}`;
}
function formatToDateOnly(d: Date) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
function formatSubmittedAt(isoStr?: string) {
    if (!isoStr) return null;
    try {
        const d = new Date(isoStr);
        if (isNaN(d.getTime())) return null;
        const month = d.toLocaleString('en-US', { month: 'short' });
        const day = d.getDate();
        const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        return `${day}/${month} ${time}`;
    } catch {
        return null;
    }
}
function isSameDay(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// ── Main Component ─────────────────────────────────────────
// The global focus-visible outline would stack on the border change, so it is switched off here.
const FIELD_CLASS = 'w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-3.5 py-3 text-sm leading-relaxed text-white placeholder-white/25 resize-none transition-colors focus:border-[#E8C15A]/60 focus:outline-none focus-visible:outline-none!';

function ModalShell({ title, subtitle, onClose, children }: {
    title: string;
    subtitle: string;
    onClose: () => void;
    children: React.ReactNode;
}) {
    return (
        <div className="fixed inset-0 z-[999999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div role="dialog" aria-modal="true" aria-label={title}
                className="w-full max-w-lg rounded-2xl border border-white/[0.08] bg-[#121214] p-5 sm:p-6 space-y-5"
                onClick={e => e.stopPropagation()}>
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-base font-semibold text-white">{title}</h2>
                        <p className="text-xs text-white/40 mt-0.5">{subtitle}</p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close"
                        className="-m-1.5 p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer">
                        <X size={16} />
                    </button>
                </div>
                {children}
                <div className="flex justify-end">
                    <button type="button" onClick={onClose}
                        className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-[#E8C15A] hover:bg-[#d4ad45] text-black text-sm font-semibold transition-colors cursor-pointer">
                        <Check size={14} /> Done
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function DisciplineTracker({ targetUserId, isMentorView = false, traineeName }: DisciplineTrackerProps) {
    const [logs, setLogs] = useState<DisciplineLog[]>([]);
    const [summary, setSummary] = useState<{ total_hours: number; active_days: number; mentor_reviews: number; total_entries: number } | null>(null);
    const [loading, setLoading] = useState(true);
    // Open on the current week instead of eight weeks of rows.
    const [selectedWeek, setSelectedWeek] = useState<number | 'all'>(() => {
        const today = new Date();
        for (let w = 1; w <= TOTAL_WEEKS; w++) {
            const start = getDayDate(w, 1), end = getDayDate(w, 7);
            end.setHours(23, 59, 59, 999);
            if (today >= start && today <= end) return w;
        }
        return today < getDayDate(1, 1) ? 1 : 'all';
    });
    const [activeEditCell, setActiveEditCell] = useState<{ week: number; day: number; mode: 'day' | 'mentor' } | null>(null);
    const [tasksBuffer, setTasksBuffer] = useState('');
    const [refsBuffer, setRefsBuffer] = useState('');
    const [mentorBuffer, setMentorBuffer] = useState('');
    const modalDebounceRef = React.useRef<NodeJS.Timeout | null>(null);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const url = targetUserId ? `/api/discipline?target_user_id=${targetUserId}` : '/api/discipline';
            const res = await fetch(url);
            if (res.ok) { const data = await res.json(); setLogs(data.logs || []); setSummary(data.summary || null); }
        } catch (err) { console.error('Failed to load discipline logs:', err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchLogs(); }, [targetUserId]);

    const logsMap = useMemo(() => {
        const map = new Map<string, DisciplineLog>();
        logs.forEach(l => map.set(`${l.week_number}_${l.day_number}`, l));
        return map;
    }, [logs]);

    const activeEditBuffersRef = React.useRef({ tasks: '', refs: '' });

    // ── Save ───────────────────────────────────────────────
    const handleSaveLog = async (week: number, day: number, updates: Partial<DisciplineLog>) => {
        try {
            const payload: any = {
                target_user_id: targetUserId,
                week_number: week,
                day_number: day,
                log_date: updates.log_date ?? formatToDateOnly(getDayDate(week, day)),
            };
            if (updates.total_hours !== undefined) payload.total_hours = updates.total_hours;
            if (updates.is_missed !== undefined) payload.is_missed = updates.is_missed;
            if (updates.done_tasks !== undefined) payload.done_tasks = updates.done_tasks;
            if (updates.student_comment !== undefined) payload.student_comment = updates.student_comment;
            if (updates.mentor_comment !== undefined) payload.mentor_comment = updates.mentor_comment;

            const res = await fetch('/api/discipline', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                const data = await res.json();
                setLogs(prev => {
                    const updated = [...prev.filter(l => !(l.week_number === week && l.day_number === day)), data.log];
                    const totalHours = updated.reduce((sum, l) => sum + (l.is_missed ? 0 : Number(l.total_hours || 0)), 0);
                    const activeDays = updated.filter(l => !l.is_missed && Number(l.total_hours) > 0).length;
                    const mentorReviewsCount = updated.filter(l => Boolean(l.mentor_comment && l.mentor_comment.trim())).length;
                    setSummary({
                        total_hours: Math.round(totalHours * 10) / 10,
                        active_days: activeDays,
                        mentor_reviews: mentorReviewsCount,
                        total_entries: updated.length,
                    });
                    return updated;
                });
            } else {
                const errData = await res.json().catch(() => null);
                console.error('[Discipline Save Failed]', res.status, errData);
            }
        } catch (err) { console.error('Failed to save log:', err); }
    };

    // ── Modal open/close ───────────────────────────────────
    const openDayModal = (week: number, day: number) => {
        const log = logsMap.get(`${week}_${day}`);
        const tasks = log?.done_tasks || '';
        const refs = log?.student_comment || '';
        activeEditBuffersRef.current = { tasks, refs };
        setTasksBuffer(tasks);
        setRefsBuffer(refs);
        setActiveEditCell({ week, day, mode: 'day' });
    };

    const openMentorModal = (week: number, day: number) => {
        const log = logsMap.get(`${week}_${day}`);
        setMentorBuffer(log?.mentor_comment || '');
        setActiveEditCell({ week, day, mode: 'mentor' });
    };

    const debouncedSave = (week: number, day: number, updates: Partial<DisciplineLog>) => {
        if (modalDebounceRef.current) clearTimeout(modalDebounceRef.current);
        modalDebounceRef.current = setTimeout(() => handleSaveLog(week, day, updates), 250);
    };

    const handleTasksChange = (text: string) => {
        setTasksBuffer(text);
        activeEditBuffersRef.current.tasks = text;
        if (!activeEditCell) return;
        const { week, day } = activeEditCell;
        setLogs(prev => {
            const ex = prev.find(l => l.week_number === week && l.day_number === day);
            const u: DisciplineLog = ex ? { ...ex, done_tasks: text } : {
                user_id: targetUserId || 0, week_number: week, day_number: day,
                log_date: formatToDateOnly(getDayDate(week, day)), total_hours: null,
                is_missed: false, done_tasks: text, student_comment: activeEditBuffersRef.current.refs,
            };
            return [...prev.filter(l => !(l.week_number === week && l.day_number === day)), u];
        });
        debouncedSave(week, day, { done_tasks: text });
    };

    const handleRefsChange = (text: string) => {
        setRefsBuffer(text);
        activeEditBuffersRef.current.refs = text;
        if (!activeEditCell) return;
        const { week, day } = activeEditCell;
        setLogs(prev => {
            const ex = prev.find(l => l.week_number === week && l.day_number === day);
            const u: DisciplineLog = ex ? { ...ex, student_comment: text } : {
                user_id: targetUserId || 0, week_number: week, day_number: day,
                log_date: formatToDateOnly(getDayDate(week, day)), total_hours: null,
                is_missed: false, done_tasks: activeEditBuffersRef.current.tasks, student_comment: text,
            };
            return [...prev.filter(l => !(l.week_number === week && l.day_number === day)), u];
        });
        debouncedSave(week, day, { student_comment: text });
    };

    const handleMentorChange = (text: string) => {
        setMentorBuffer(text);
        if (!activeEditCell) return;
        const { week, day } = activeEditCell;
        setLogs(prev => {
            const ex = prev.find(l => l.week_number === week && l.day_number === day);
            const u: DisciplineLog = ex ? { ...ex, mentor_comment: text } : {
                user_id: targetUserId || 0, week_number: week, day_number: day,
                log_date: formatToDateOnly(getDayDate(week, day)), total_hours: null,
                is_missed: false, done_tasks: '', student_comment: '', mentor_comment: text,
            };
            return [...prev.filter(l => !(l.week_number === week && l.day_number === day)), u];
        });
        debouncedSave(week, day, { mentor_comment: text });
    };

    const closeModal = () => {
        if (modalDebounceRef.current) clearTimeout(modalDebounceRef.current);
        if (activeEditCell) {
            const { week, day, mode } = activeEditCell;
            if (mode === 'mentor') {
                handleSaveLog(week, day, { mentor_comment: mentorBuffer });
            } else {
                handleSaveLog(week, day, {
                    done_tasks: activeEditBuffersRef.current.tasks,
                    student_comment: activeEditBuffersRef.current.refs,
                });
            }
        }
        setActiveEditCell(null);
    };

    const weeksToRender = useMemo(() => {
        if (selectedWeek === 'all') return Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1);
        return [selectedWeek];
    }, [selectedWeek]);

    const now = new Date();

    // Consistency counts only days that have opened so far, not the whole program.
    const elapsedDays = Math.min(TOTAL_WEEKS * DAYS_PER_WEEK,
        Math.max(0, Math.floor((now.getTime() - PROGRAM_START_DATE.getTime()) / 86400000) + 1));
    const activeDays = summary?.active_days || 0;
    const consistency = elapsedDays ? Math.round((activeDays / elapsedDays) * 100) : 0;
    const currentWeek = elapsedDays ? Math.ceil(elapsedDays / DAYS_PER_WEEK) : 0;
    const stats = [
        { label: 'Hours logged', value: `${summary?.total_hours || 0}h` },
        { label: 'Days logged', value: `${activeDays}/${elapsedDays}` },
        { label: 'Mentor replies', value: String(summary?.mentor_reviews || 0) },
        { label: 'Consistency', value: `${consistency}%` },
    ];
    const emptyText = 'text-white/25';
    const sentAt = activeEditCell ? formatSubmittedAt(logsMap.get(`${activeEditCell.week}_${activeEditCell.day}`)?.submitted_at) : '';

    return (
        <div className="space-y-5">
            {/* ── Header ─────────────────────────────────── */}
            <div className="space-y-4">
                <div>
                    <h1 className="text-xl font-semibold text-white tracking-tight">
                        {isMentorView ? `${traineeName || 'Trainee'}'s study log` : 'Study log'}
                    </h1>
                    <p className="text-sm text-white/45 mt-1 max-w-xl">
                        {isMentorView
                            ? 'Daily hours, what they covered, and where they studied. Leave feedback on any day.'
                            : 'Log your hours, what you covered, and where you studied. Your mentor reads this and replies.'}
                    </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 rounded-2xl border border-white/[0.08] bg-[#121214] divide-x divide-y sm:divide-y-0 divide-white/[0.06]">
                    {stats.map(stat => (
                        <div key={stat.label} className="px-4 py-3">
                            <div className="text-lg font-semibold text-[#E8C15A] tabular-nums">{stat.value}</div>
                            <div className="text-xs text-white/40">{stat.label}</div>
                        </div>
                    ))}
                </div>

                <div className="flex gap-1 overflow-x-auto p-1.5 rounded-xl border border-white/10 bg-[#0B0B0C] w-fit max-w-full" role="tablist" aria-label="Week">
                    {(['all', ...Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1)] as const).map(w => (
                        <button key={w} role="tab" aria-selected={selectedWeek === w} onClick={() => setSelectedWeek(w)}
                            className={`relative shrink-0 px-3 h-8 rounded-lg text-sm transition-colors cursor-pointer ${selectedWeek === w ? 'bg-[#E8C15A] text-black font-semibold' : w !== 'all' && w > currentWeek ? 'text-white/25 hover:text-white/60 hover:bg-white/[0.06]' : 'text-white/50 hover:text-white hover:bg-white/[0.06]'}`}>
                            {w === 'all' ? 'All' : `Week ${w}`}
                            {w === currentWeek && selectedWeek !== w && (
                                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#E8C15A]" aria-label="This week" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {isMentorView && !loading && (summary?.total_entries || 0) === 0 ? (
                <div className="rounded-2xl border border-white/[0.08] bg-[#121214] p-8 text-center text-sm text-white/50">
                    {traineeName || 'This trainee'} has not logged any study days yet.
                </div>
            ) : loading ? (
                <div className="py-16 text-center text-sm text-white/30">Loading…</div>
            ) : (
                <div className="space-y-6">
                    {weeksToRender.map(weekNum => {
                        const weekHours = Array.from({ length: DAYS_PER_WEEK }, (_, d) => {
                            const log = logsMap.get(`${weekNum}_${d + 1}`);
                            return (log && !log.is_missed) ? Number(log.total_hours || 0) : 0;
                        }).reduce((a, b) => a + b, 0);
                        const range = `${formatDayDate(getDayDate(weekNum, 1))} – ${formatDayDate(getDayDate(weekNum, DAYS_PER_WEEK))}`;

                        return (
                            <section key={weekNum} className="rounded-2xl border border-white/[0.08] bg-[#121214] overflow-hidden">
                                <div className="flex items-baseline justify-between gap-3 px-4 py-3 border-b border-white/[0.08] bg-black/20">
                                    <div className="flex items-baseline gap-3">
                                        <h2 className="text-sm font-bold text-[#E8C15A]">Week {weekNum}</h2>
                                        <span className="text-xs text-white/40">{range}</span>
                                    </div>
                                    <span className="text-xs text-white/50 tabular-nums">{Math.round(weekHours * 10) / 10}h</span>
                                </div>

                                <div className="hidden md:grid grid-cols-[96px_72px_1fr_1fr_1fr] gap-4 px-4 py-2 text-xs text-white/35 border-b border-white/[0.06]">
                                    <span>Day</span><span>Hours</span><span>Completed</span><span>References</span><span>Mentor</span>
                                </div>

                                <ul className="divide-y divide-white/[0.06]">
                                    {Array.from({ length: DAYS_PER_WEEK }, (_, dayIdx) => {
                                        const dayNum = dayIdx + 1;
                                        const key = `${weekNum}_${dayNum}`;
                                        const log = logsMap.get(key);
                                        const dayDate = getDayDate(weekNum, dayNum);
                                        const unlockTs = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 0, 0, 0).getTime();
                                        const isUnlocked = isMentorView || Date.now() >= unlockTs;
                                        const isToday = isSameDay(dayDate, now);
                                        // Students edit today and any past day; future days unlock at midnight.
                                        const canStudentEdit = !isMentorView && isUnlocked;
                                        const sent = log?.submitted_at && (Boolean(log.done_tasks) || Boolean(log.student_comment) || (log.total_hours !== null && Number(log.total_hours) > 0));
                                        const hasNotes = Boolean(log?.done_tasks?.trim() || log?.student_comment?.trim());
                                        const editable = canStudentEdit ? 'cursor-pointer hover:bg-white/[0.04]' : '';

                                        return (
                                            <li key={key} className={`grid md:grid-cols-[96px_72px_1fr_1fr_1fr] gap-x-4 gap-y-2 px-4 py-3 items-start ${!isUnlocked ? 'opacity-40' : ''} ${isToday ? 'bg-[#E8C15A]/[0.04]' : ''}`}>
                                                <div className="flex md:block items-center justify-between gap-2">
                                                    <div className={`text-sm ${isToday ? 'text-[#E8C15A] font-medium' : 'text-white/80'}`}>
                                                        Day {dayNum}{isToday && <span className="ml-2 text-[11px] font-normal">Today</span>}
                                                    </div>
                                                    <div className="text-xs text-white/35 flex items-center gap-1.5">
                                                        {formatDayDate(dayDate)}
                                                        {!isUnlocked && <Lock size={10} aria-label="Locked" />}
                                                    </div>
                                                    {sent && (
                                                        <div className="hidden md:block text-[11px] text-white/30 mt-1" title={new Date(log!.submitted_at!).toLocaleString()}>
                                                            Sent {formatSubmittedAt(log!.submitted_at)}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className={!isUnlocked ? 'hidden md:block' : ''}>
                                                    <span className="md:hidden text-[11px] text-white/35 mr-2">Hours</span>
                                                    {!isUnlocked ? null : canStudentEdit ? (
                                                        <TimeInputCell value={log?.total_hours} onSave={(h) => handleSaveLog(weekNum, dayNum, { total_hours: h, is_missed: false })} />
                                                    ) : (
                                                        <span className="text-sm text-white/70 tabular-nums">
                                                            {log?.total_hours != null && log.total_hours !== '' ? `${log.total_hours}h` : <span className={emptyText}>—</span>}
                                                        </span>
                                                    )}
                                                </div>

                                                {!isUnlocked ? (
                                                    <p className={`md:col-span-3 text-sm py-1 ${emptyText}`}>Not open yet</p>
                                                ) : !hasNotes ? (
                                                    // One prompt for an empty day instead of a placeholder in every column.
                                                    canStudentEdit ? (
                                                        <button type="button" onClick={() => openDayModal(weekNum, dayNum)}
                                                            className="md:col-span-2 -mx-2 px-2 py-1 min-h-[28px] rounded-lg text-left text-sm text-white/30 hover:text-white/70 hover:bg-white/[0.04] transition-colors cursor-pointer">
                                                            + Write what you covered
                                                        </button>
                                                    ) : (
                                                        <p className={`md:col-span-2 text-sm py-1 ${emptyText}`}>Nothing written</p>
                                                    )
                                                ) : (
                                                    ([
                                                        { label: 'Completed', text: log?.done_tasks },
                                                        { label: 'References', text: log?.student_comment },
                                                    ] as const).map(col => (
                                                        <div key={col.label} onClick={() => canStudentEdit && openDayModal(weekNum, dayNum)}
                                                            className={`rounded-lg -mx-2 px-2 py-1 min-h-[28px] transition-colors ${editable}`}>
                                                            <span className="md:hidden block text-[11px] text-white/35 mb-0.5">{col.label}</span>
                                                            <p className="text-sm text-white/80 whitespace-pre-wrap break-words line-clamp-3" dir="auto">
                                                                {col.text || <span className={emptyText}>—</span>}
                                                            </p>
                                                        </div>
                                                    ))
                                                )}

                                                {isUnlocked && (
                                                    <div onClick={() => isMentorView && openMentorModal(weekNum, dayNum)}
                                                        className={`rounded-lg -mx-2 px-2 py-1 min-h-[28px] transition-colors ${isMentorView ? 'cursor-pointer hover:bg-white/[0.04]' : ''}`}>
                                                        {log?.mentor_comment ? (
                                                            <div>
                                                                <span className="md:hidden block text-[11px] text-white/35 mb-0.5">Mentor</span>
                                                                <p className="text-sm text-white/85 whitespace-pre-wrap break-words line-clamp-3" dir="auto">{log.mentor_comment}</p>
                                                                <p className="text-[11px] text-[#E8C15A]/70 mt-0.5">{log.mentor_name || 'Mentor'}</p>
                                                            </div>
                                                        ) : isMentorView ? (
                                                            <span className="text-sm text-white/30">+ Add feedback</span>
                                                        ) : sent ? (
                                                            <span className={`text-sm ${emptyText}`}>Awaiting review</span>
                                                        ) : null}
                                                    </div>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            </section>
                        );
                    })}
                </div>
            )}

            {/* ── Day edit modal ── */}
            {activeEditCell && activeEditCell.mode === 'day' && (
                <ModalShell
                    title="Daily log"
                    subtitle={`Week ${activeEditCell.week} · Day ${activeEditCell.day}${sentAt ? ` · Sent ${sentAt}` : ''}`}
                    onClose={closeModal}
                >
                    <label className="block space-y-1.5">
                        <span className="text-sm text-white/70">What did you complete?</span>
                        <textarea
                            value={tasksBuffer}
                            onChange={e => handleTasksChange(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Escape') closeModal(); }}
                            autoFocus rows={4} dir="auto"
                            placeholder="Problems solved, sheets finished, sessions watched"
                            className={FIELD_CLASS}
                        />
                    </label>
                    <label className="block space-y-1.5">
                        <span className="text-sm text-white/70">Where did you study from?</span>
                        <textarea
                            value={refsBuffer}
                            onChange={e => handleRefsChange(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Escape') closeModal(); }}
                            rows={3} dir="auto"
                            placeholder="Handbook chapter, video, editorial link"
                            className={FIELD_CLASS}
                        />
                    </label>
                </ModalShell>
            )}

            {/* ── Mentor feedback modal ── */}
            {activeEditCell && activeEditCell.mode === 'mentor' && (
                <ModalShell
                    title="Mentor feedback"
                    subtitle={`Week ${activeEditCell.week} · Day ${activeEditCell.day}`}
                    onClose={closeModal}
                >
                    <textarea
                        value={mentorBuffer}
                        onChange={e => handleMentorChange(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Escape') closeModal(); }}
                        autoFocus rows={6} dir="auto"
                        aria-label="Mentor feedback"
                        placeholder="Feedback, praise, or what to study next"
                        className={FIELD_CLASS}
                    />
                </ModalShell>
            )}
        </div>
    );
}
