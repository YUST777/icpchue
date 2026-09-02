'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    Clock, 
    Calendar, 
    Flame, 
    MessageSquare, 
    CheckCircle2, 
    Edit3, 
    Sparkles,
    Check,
    Lock
} from 'lucide-react';

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
}

interface DisciplineTrackerProps {
    targetUserId?: number;
    isMentorView?: boolean;
    traineeName?: string;
}

const TOTAL_WEEKS = 8;
const DAYS_PER_WEEK = 7;
const PROGRAM_START_DATE = new Date(2026, 7, 30, 0, 0, 0);

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
            className="w-14 h-8 bg-black/40 border border-white/10 rounded-xl text-center font-mono font-bold text-xs text-[#E8C15A] focus:border-[#E8C15A] focus:outline-none transition-colors"
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
function isSameDay(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// ── Main Component ─────────────────────────────────────────
export default function DisciplineTracker({ targetUserId, isMentorView = false, traineeName }: DisciplineTrackerProps) {
    const [logs, setLogs] = useState<DisciplineLog[]>([]);
    const [summary, setSummary] = useState<{ total_hours: number; active_days: number; mentor_reviews: number; total_entries: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedWeek, setSelectedWeek] = useState<number | 'all'>('all');
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

    // ── Save ───────────────────────────────────────────────
    const handleSaveLog = async (week: number, day: number, updates: Partial<DisciplineLog>) => {
        try {
            const key = `${week}_${day}`;
            const current = logsMap.get(key) || {
                user_id: targetUserId || 0, week_number: week, day_number: day,
                log_date: new Date().toISOString().split('T')[0],
                total_hours: 0, is_missed: false, done_tasks: '', student_comment: '',
            };
            const payload = {
                target_user_id: targetUserId, week_number: week, day_number: day,
                log_date: updates.log_date ?? current.log_date,
                total_hours: updates.total_hours ?? current.total_hours,
                is_missed: updates.is_missed ?? current.is_missed,
                done_tasks: updates.done_tasks ?? current.done_tasks,
                student_comment: updates.student_comment ?? current.student_comment,
                mentor_comment: updates.mentor_comment ?? current.mentor_comment,
            };
            const res = await fetch('/api/discipline', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (res.ok) {
                const data = await res.json();
                setLogs(prev => [...prev.filter(l => !(l.week_number === week && l.day_number === day)), data.log]);
            }
        } catch (err) { console.error('Failed to save log:', err); }
    };

    // ── Modal open/close ───────────────────────────────────
    const openDayModal = (week: number, day: number) => {
        const log = logsMap.get(`${week}_${day}`);
        setTasksBuffer(log?.done_tasks || '');
        setRefsBuffer(log?.student_comment || '');
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
        if (!activeEditCell) return;
        const { week, day } = activeEditCell;
        // optimistic
        setLogs(prev => {
            const ex = prev.find(l => l.week_number === week && l.day_number === day);
            const u: DisciplineLog = ex ? { ...ex, done_tasks: text } : {
                user_id: targetUserId || 0, week_number: week, day_number: day,
                log_date: new Date().toISOString().split('T')[0], total_hours: null,
                is_missed: false, done_tasks: text, student_comment: refsBuffer,
            };
            return [...prev.filter(l => !(l.week_number === week && l.day_number === day)), u];
        });
        debouncedSave(week, day, { done_tasks: text, student_comment: refsBuffer });
    };

    const handleRefsChange = (text: string) => {
        setRefsBuffer(text);
        if (!activeEditCell) return;
        const { week, day } = activeEditCell;
        setLogs(prev => {
            const ex = prev.find(l => l.week_number === week && l.day_number === day);
            const u: DisciplineLog = ex ? { ...ex, student_comment: text } : {
                user_id: targetUserId || 0, week_number: week, day_number: day,
                log_date: new Date().toISOString().split('T')[0], total_hours: null,
                is_missed: false, done_tasks: tasksBuffer, student_comment: text,
            };
            return [...prev.filter(l => !(l.week_number === week && l.day_number === day)), u];
        });
        debouncedSave(week, day, { done_tasks: tasksBuffer, student_comment: text });
    };

    const handleMentorChange = (text: string) => {
        setMentorBuffer(text);
        if (!activeEditCell) return;
        const { week, day } = activeEditCell;
        setLogs(prev => {
            const ex = prev.find(l => l.week_number === week && l.day_number === day);
            const u: DisciplineLog = ex ? { ...ex, mentor_comment: text } : {
                user_id: targetUserId || 0, week_number: week, day_number: day,
                log_date: new Date().toISOString().split('T')[0], total_hours: null,
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
            if (mode === 'mentor') handleSaveLog(week, day, { mentor_comment: mentorBuffer });
            else handleSaveLog(week, day, { done_tasks: tasksBuffer, student_comment: refsBuffer });
        }
        setActiveEditCell(null);
    };

    const weeksToRender = useMemo(() => {
        if (selectedWeek === 'all') return Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1);
        return [selectedWeek];
    }, [selectedWeek]);

    const now = new Date();

    return (
        <div className="space-y-4">
            {/* ── Header ─────────────────────────────────── */}
            <div className="bg-[#121214]/90 border border-white/[0.08] rounded-2xl p-4 md:p-5 shadow-[0_4px_20px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="p-1.5 rounded-lg bg-[#E8C15A]/10 text-[#E8C15A] border border-[#E8C15A]/20"><Flame size={16} /></span>
                            <h1 className="text-base md:text-lg font-bold text-white tracking-tight">
                                {isMentorView ? `${traineeName || 'Trainee'}'s Self Discipline Tracker` : 'Self Discipline & Study Log'}
                            </h1>
                        </div>
                        <p className="text-xs text-white/50 mt-1 max-w-xl">
                            {isMentorView 
                                ? 'Review daily practice hours, logged problem topics, and trainee self-reflection. Provide feedback directly on any day.'
                                : 'Log your daily study hours, problem sets completed, and reflections. Your mentor reviews this schedule to guide your progress.'}
                        </p>
                    </div>

                    {/* Week Filter */}
                    <div className="flex items-center gap-1.5 flex-wrap bg-[#0B0B0C] p-1.5 rounded-xl border border-white/10 self-start md:self-auto">
                        <button onClick={() => setSelectedWeek('all')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${selectedWeek === 'all' ? 'bg-[#E8C15A] text-black font-bold shadow-xs' : 'text-white/40 hover:text-white'}`}>
                            All Weeks
                        </button>
                        {Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1).map(w => (
                            <button key={w} onClick={() => setSelectedWeek(w)}
                                className={`px-2 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${selectedWeek === w ? 'bg-[#E8C15A] text-black font-bold shadow-xs' : 'text-white/40 hover:text-white'}`}>
                                W{w}
                            </button>
                        ))}
                    </div>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-white/[0.06]">
                    <div className="bg-black/30 border border-white/5 rounded-xl p-3">
                        <div className="flex items-center justify-between text-white/40 text-[11px] mb-1"><span>Total Practice</span><Clock size={12} className="text-[#E8C15A]" /></div>
                        <div className="text-lg font-bold font-mono text-[#E8C15A]">{summary?.total_hours || 0} <span className="text-xs font-normal text-white/40">hrs</span></div>
                    </div>
                    <div className="bg-black/30 border border-white/5 rounded-xl p-3">
                        <div className="flex items-center justify-between text-white/40 text-[11px] mb-1"><span>Active Days</span><Calendar size={12} className="text-emerald-400" /></div>
                        <div className="text-lg font-bold font-mono text-emerald-400">{summary?.active_days || 0} <span className="text-xs font-normal text-white/40">days</span></div>
                    </div>
                    <div className="bg-black/30 border border-white/5 rounded-xl p-3">
                        <div className="flex items-center justify-between text-white/40 text-[11px] mb-1"><span>Mentor Feedback</span><MessageSquare size={12} className="text-sky-400" /></div>
                        <div className="text-lg font-bold font-mono text-sky-400">{summary?.mentor_reviews || 0} <span className="text-xs font-normal text-white/40">notes</span></div>
                    </div>
                    <div className="bg-black/30 border border-white/5 rounded-xl p-3">
                        <div className="flex items-center justify-between text-white/40 text-[11px] mb-1"><span>Consistency</span><Sparkles size={12} className="text-amber-400" /></div>
                        <div className="text-lg font-bold font-mono text-white">{Math.round(((summary?.active_days || 0) / (TOTAL_WEEKS * 7)) * 100)}%</div>
                    </div>
                </div>
            </div>

            {/* ── Table ──────────────────────────────────── */}
            <div className="bg-[#121214]/90 border border-white/[0.08] rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[850px]">
                        <thead>
                            <tr className="border-b border-white/10 bg-black/60 text-[11px] uppercase tracking-wider font-mono text-white/60">
                                <th className="p-3 w-20 text-center font-bold text-[#E8C15A] border-r border-white/10">Week</th>
                                <th className="p-3 w-28 text-center border-r border-white/10">Day</th>
                                <th className="p-3 w-28 text-center border-r border-white/10">Hours</th>
                                <th className="p-3 w-1/3 border-r border-white/10">What You Completed</th>
                                <th className="p-3 w-1/3 border-r border-white/10">Study References / Sources</th>
                                <th className="p-3 w-1/4">Mentor Notes & Feedback</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.06] text-xs">
                            {loading ? (
                                <tr><td colSpan={6} className="p-12 text-center text-white/30 font-mono text-sm">Loading discipline data...</td></tr>
                            ) : weeksToRender.map(weekNum => {
                                const weekHours = Array.from({ length: DAYS_PER_WEEK }, (_, d) => {
                                    const log = logsMap.get(`${weekNum}_${d + 1}`);
                                    return (log && !log.is_missed) ? Number(log.total_hours || 0) : 0;
                                }).reduce((a, b) => a + b, 0);

                                return (
                                    <React.Fragment key={weekNum}>
                                        {Array.from({ length: DAYS_PER_WEEK }, (_, dayIdx) => {
                                            const dayNum = dayIdx + 1;
                                            const key = `${weekNum}_${dayNum}`;
                                            const log = logsMap.get(key);
                                            const dayDate = getDayDate(weekNum, dayNum);
                                            const displayDate = formatDayDate(dayDate);

                                            const unlockTs = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 0, 0, 0).getTime();
                                            const isUnlocked = isMentorView || Date.now() >= unlockTs;
                                            const isToday = isSameDay(dayDate, now);
                                            const isPast = dayDate.getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
                                            // Students can only edit TODAY; mentors can always view
                                            const canStudentEdit = !isMentorView && isToday;

                                            return (
                                                <tr key={key} className={`transition-colors group ${
                                                    !isUnlocked ? 'opacity-35 bg-black/20' 
                                                    : isToday ? 'bg-[#E8C15A]/[0.03] hover:bg-[#E8C15A]/[0.06]' 
                                                    : 'hover:bg-white/[0.02]'
                                                }`}>
                                                    {/* Week banner */}
                                                    {dayIdx === 0 && (
                                                        <td rowSpan={DAYS_PER_WEEK} className="p-3 bg-black/40 border-r border-white/10 text-center align-middle border-b border-white/10 shadow-inner">
                                                            <div className="flex flex-col items-center justify-center gap-1.5 py-4">
                                                                <span className="font-mono text-xs font-black tracking-wider text-[#E8C15A] [writing-mode:vertical-lr] rotate-180">WEEK {weekNum}</span>
                                                                <span className="text-[10px] font-normal text-white/40 font-mono mt-2">{weekHours}h total</span>
                                                            </div>
                                                        </td>
                                                    )}

                                                    {/* Day cell */}
                                                    <td className="p-2.5 text-center border-r border-white/[0.06] bg-black/20">
                                                        <div className="flex flex-col items-center justify-center">
                                                            <span className={`font-mono text-[11px] flex items-center justify-center gap-1 ${isToday ? 'text-[#E8C15A] font-bold' : 'text-white/70'}`}>
                                                                Day {dayNum}
                                                                {!isUnlocked && <Lock size={10} className="text-amber-400/80" />}
                                                            </span>
                                                            <span className="text-[10px] font-mono text-white/40 mt-0.5">{displayDate}</span>
                                                        </div>
                                                    </td>

                                                    {/* Hours cell */}
                                                    <td className="p-2 text-center border-r border-white/[0.06]">
                                                        {!isUnlocked ? (
                                                            <div className="flex items-center justify-center text-white/20"><Lock size={12} /></div>
                                                        ) : canStudentEdit ? (
                                                            <div className="flex items-center justify-center">
                                                                <TimeInputCell value={log?.total_hours} onSave={(h) => handleSaveLog(weekNum, dayNum, { total_hours: h, is_missed: false })} />
                                                            </div>
                                                        ) : (
                                                            <span className="font-mono text-xs text-white/60 font-bold">
                                                                {log?.total_hours != null && log.total_hours !== '' ? `${log.total_hours}h` : <span className="text-white/20">—</span>}
                                                            </span>
                                                        )}
                                                    </td>

                                                    {/* Tasks cell */}
                                                    <td className="p-2.5 border-r border-white/[0.06]">
                                                        {!isUnlocked ? (
                                                            <div className="min-h-[32px] p-1.5 flex items-center text-white/20 text-[11px] font-mono gap-1.5"><Lock size={11} className="text-white/30" /> Locked</div>
                                                        ) : (
                                                            <div onClick={() => canStudentEdit && openDayModal(weekNum, dayNum)}
                                                                className={`min-h-[32px] p-1.5 rounded-lg border border-transparent transition-all flex items-start justify-between gap-2 ${canStudentEdit ? 'hover:bg-white/[0.04] hover:border-white/10 cursor-pointer' : ''}`}>
                                                                <div className="text-xs text-white/80 whitespace-pre-wrap break-words line-clamp-2" dir="auto">
                                                                    {log?.done_tasks || <span className="text-white/20 italic font-mono text-[11px]">{canStudentEdit ? '+ Add completed topics' : '—'}</span>}
                                                                </div>
                                                                {canStudentEdit && <Edit3 size={11} className="text-white/20 group-hover:text-white/40 shrink-0 mt-0.5" />}
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* References cell */}
                                                    <td className="p-2.5 border-r border-white/[0.06]">
                                                        {!isUnlocked ? (
                                                            <div className="min-h-[32px] p-1.5 flex items-center text-white/20 text-[11px] font-mono gap-1.5"><Lock size={11} className="text-white/30" /> Locked</div>
                                                        ) : (
                                                            <div onClick={() => canStudentEdit && openDayModal(weekNum, dayNum)}
                                                                className={`min-h-[32px] p-1.5 rounded-lg border border-transparent transition-all flex items-start justify-between gap-2 ${canStudentEdit ? 'hover:bg-white/[0.04] hover:border-white/10 cursor-pointer' : ''}`}>
                                                                <div className="text-xs text-white/80 whitespace-pre-wrap break-words line-clamp-2" dir="auto">
                                                                    {log?.student_comment || <span className="text-white/20 italic font-mono text-[11px]">{canStudentEdit ? '+ Add study references' : '—'}</span>}
                                                                </div>
                                                                {canStudentEdit && <Edit3 size={11} className="text-white/20 group-hover:text-white/40 shrink-0 mt-0.5" />}
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Mentor cell */}
                                                    <td className="p-2.5">
                                                        <div onClick={() => isMentorView && openMentorModal(weekNum, dayNum)}
                                                            className={`min-h-[32px] p-1.5 rounded-lg border border-transparent transition-all flex items-start justify-between gap-2 ${isMentorView ? 'hover:bg-[#E8C15A]/10 hover:border-[#E8C15A]/30 cursor-pointer' : ''}`}>
                                                            <div className="text-xs text-white/90 whitespace-pre-wrap break-words line-clamp-2" dir="auto">
                                                                {log?.mentor_comment ? (
                                                                    <div className="flex items-start gap-1.5">
                                                                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#E8C15A]/15 text-[#E8C15A] border border-[#E8C15A]/30 shrink-0">{log.mentor_name || 'Mentor'}</span>
                                                                        <span>{log.mentor_comment}</span>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-white/20 italic font-mono text-[11px]">{isMentorView ? '+ Add mentor note' : 'Pending review'}</span>
                                                                )}
                                                            </div>
                                                            {isMentorView && <Edit3 size={11} className="text-[#E8C15A]/40 group-hover:text-[#E8C15A] shrink-0 mt-0.5" />}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Day Edit Modal (2 fields: Tasks + References) ── */}
            {activeEditCell && activeEditCell.mode === 'day' && (
                <div className="fixed inset-0 z-[999999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={closeModal}>
                    <div className="bg-[#111113] border border-white/[0.08] rounded-2xl w-full max-w-lg p-4 sm:p-5 space-y-3.5 shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.06)] animate-scale-in" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-mono font-semibold text-[#E8C15A] bg-[#E8C15A]/10 px-2 py-0.5 rounded-md border border-[#E8C15A]/20">
                                    W{activeEditCell.week} · Day {activeEditCell.day}
                                </span>
                                <span className="text-xs font-medium text-white/90">Daily Log</span>
                            </div>
                            <button type="button" onClick={closeModal} className="w-6 h-6 rounded-lg text-white/30 hover:text-white hover:bg-white/5 flex items-center justify-center text-xs transition-colors cursor-pointer">✕</button>
                        </div>

                        {/* Field 1: What you completed */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-mono font-bold text-white/50 uppercase tracking-wider">What did you complete?</label>
                            <textarea
                                value={tasksBuffer}
                                onChange={e => handleTasksChange(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Escape') closeModal(); }}
                                autoFocus rows={3} dir="auto"
                                placeholder="e.g. 2 problems + syntax sheet, watched binary search session, solved 3 problems..."
                                className="w-full bg-black/40 border border-white/[0.08] focus:border-[#E8C15A]/40 focus:bg-black/60 rounded-xl p-3 text-xs text-white/90 placeholder-white/20 focus:outline-none transition-all resize-none font-sans leading-relaxed"
                            />
                        </div>

                        {/* Field 2: References */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-mono font-bold text-white/50 uppercase tracking-wider">References you studied from</label>
                            <textarea
                                value={refsBuffer}
                                onChange={e => handleRefsChange(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Escape') closeModal(); }}
                                rows={3} dir="auto"
                                placeholder="e.g. CP handbook ch.5, Errichto YT vid, USACO guide, Codeforces editorial #1923..."
                                className="w-full bg-black/40 border border-white/[0.08] focus:border-[#E8C15A]/40 focus:bg-black/60 rounded-xl p-3 text-xs text-white/90 placeholder-white/20 focus:outline-none transition-all resize-none font-sans leading-relaxed"
                            />
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end pt-1">
                            <button type="button" onClick={closeModal}
                                className="px-4 py-1.5 rounded-xl bg-[#E8C15A] hover:bg-[#d4ad45] text-black font-semibold text-xs transition-all shadow-[0_2px_10px_rgba(232,193,90,0.2)] flex items-center gap-1.5 cursor-pointer active:scale-95">
                                <Check size={12} /> Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Mentor Modal (single field) ── */}
            {activeEditCell && activeEditCell.mode === 'mentor' && (
                <div className="fixed inset-0 z-[999999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={closeModal}>
                    <div className="bg-[#111113] border border-white/[0.08] rounded-2xl w-full max-w-lg p-4 sm:p-5 space-y-3.5 shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.06)] animate-scale-in" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-mono font-semibold text-[#E8C15A] bg-[#E8C15A]/10 px-2 py-0.5 rounded-md border border-[#E8C15A]/20">W{activeEditCell.week} · Day {activeEditCell.day}</span>
                                <span className="text-xs font-medium text-white/90">Mentor Feedback</span>
                            </div>
                            <button type="button" onClick={closeModal} className="w-6 h-6 rounded-lg text-white/30 hover:text-white hover:bg-white/5 flex items-center justify-center text-xs transition-colors cursor-pointer">✕</button>
                        </div>
                        <textarea
                            value={mentorBuffer}
                            onChange={e => handleMentorChange(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Escape') closeModal(); }}
                            autoFocus rows={5} dir="auto"
                            placeholder="Write mentor feedback, praise, or study recommendations..."
                            className="w-full bg-black/40 border border-white/[0.08] focus:border-[#E8C15A]/40 focus:bg-black/60 rounded-xl p-3 text-xs text-white/90 placeholder-white/20 focus:outline-none transition-all resize-none font-sans leading-relaxed"
                        />
                        <div className="flex items-center justify-end pt-1">
                            <button type="button" onClick={closeModal}
                                className="px-4 py-1.5 rounded-xl bg-[#E8C15A] hover:bg-[#d4ad45] text-black font-semibold text-xs transition-all shadow-[0_2px_10px_rgba(232,193,90,0.2)] flex items-center gap-1.5 cursor-pointer active:scale-95">
                                <Check size={12} /> Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
