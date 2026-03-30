import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, History, Globe, Clock, MemoryStick, RefreshCw, ChevronRight, CheckCircle2, XCircle, AlertCircle, Timer, Pencil, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '@/components/ui/Skeleton';
import { Submission } from './types';

interface SubmissionsListProps {
    submissions: Submission[];
    loading: boolean;
    onViewCode: (id: number) => void;
    contestId?: string;
    problemIndex?: string;
    urlType?: string;
    groupId?: string;
}

interface GlobalSubmission {
    id: number;
    creationTimeSeconds: number;
    author: string;
    verdict: string;
    timeConsumedMillis: number;
    memoryConsumedBytes: number;
    language: string;
}

/* ── helpers ── */

const NOTE_COLORS = [
    { name: 'default', hex: '#333333' },
    { name: 'yellow', hex: '#f6d32d' },
    { name: 'blue', hex: '#3182ce' },
    { name: 'green', hex: '#38a169' },
    { name: 'pink', hex: '#d53f8c' },
    { name: 'purple', hex: '#805ad5' },
];

function timeAgo(dateStr: string): string {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diff = Math.max(0, now - then);
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return 'just now';
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min} min ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} hr ago`;
    const days = Math.floor(hr / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
}

function formatMemory(kb: number | string): string {
    if (!kb && kb !== 0) return '-';
    if (typeof kb === 'string') return kb;
    if (kb >= 1024) return `${((kb as number) / 1024).toFixed(1)} MB`;
    return `${kb} KB`;
}

function formatTime(ms: number | string): string {
    if (!ms && ms !== 0) return '-';
    if (typeof ms === 'string') return ms;
    return `${ms} ms`;
}

function formatVerdict(v: string): string {
    if (!v) return 'Unknown';
    const vUpper = v.toUpperCase();
    if (vUpper === 'OK' || vUpper === 'ACCEPTED') return 'Accepted';
    if (vUpper === 'WRONG_ANSWER') return 'Wrong Answer';
    if (vUpper === 'TIME_LIMIT_EXCEEDED') return 'TLE';
    if (vUpper === 'MEMORY_LIMIT_EXCEEDED') return 'MLE';
    if (vUpper === 'RUNTIME_ERROR') return 'Runtime Error';
    if (vUpper === 'COMPILATION_ERROR') return 'Compile Error';
    return v.replace(/_/g, ' ');
}

type VerdictType = 'accepted' | 'error' | 'pending';

function getVerdictType(v: string): VerdictType {
    if (!v) return 'error';
    if (v === 'Accepted' || v === 'OK') return 'accepted';
    const upper = v.toUpperCase();
    if (upper === 'TESTING' || upper === 'PENDING' || upper === 'IN QUEUE' || upper.includes('WAITING')) return 'pending';
    return 'error';
}

const verdictColors: Record<VerdictType, { text: string; bg: string; border: string }> = {
    accepted: { text: 'text-[#2cbb5d]', bg: 'bg-[#2cbb5d]/10', border: 'border-[#2cbb5d]/30' },
    error: { text: 'text-[#ef4743]', bg: 'bg-[#ef4743]/10', border: 'border-[#ef4743]/30' },
    pending: { text: 'text-[#ffa116]', bg: 'bg-[#ffa116]/10', border: 'border-[#ffa116]/30' },
};

/* ── Components ── */

function NotesModal({ isOpen, onClose, note, color, onSave, isSaving }: any) {
    const [currentNote, setCurrentNote] = useState(note || '');
    const [currentColor, setCurrentColor] = useState(color || 'default');

    useEffect(() => {
        if (isOpen) {
            setCurrentNote(note || '');
            setCurrentColor(color || 'default');
        }
    }, [isOpen, note, color]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                />
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative w-full max-w-lg bg-[#1a1a1a] rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
                >
                    <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/[0.02]">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider ml-2">Notes</h3>
                        <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-lg transition-colors">
                            <X size={18} className="text-white/40" />
                        </button>
                    </div>

                    <div className="p-6 space-y-6">
                        <textarea
                            autoFocus
                            value={currentNote}
                            onChange={(e) => setCurrentNote(e.target.value)}
                            placeholder="Add your notes here..."
                            className="w-full h-40 bg-[#0B0B0C] border border-white/5 rounded-xl p-4 text-sm text-white/80 outline-none focus:border-[#E8C15A]/30 transition-colors resize-none"
                        />

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {NOTE_COLORS.map((c) => (
                                    <button
                                        key={c.name}
                                        onClick={() => setCurrentColor(c.name)}
                                        className={`w-3 h-3 rounded-full border transition-all flex items-center justify-center ${
                                            currentColor === c.name 
                                                ? 'border-white scale-110 shadow-[0_0_8px_rgba(255,255,255,0.3)]' 
                                                : 'border-transparent hover:scale-110 opacity-60 hover:opacity-100'
                                        }`}
                                        style={{ backgroundColor: c.hex }}
                                    >
                                        {currentColor === c.name && <CheckCircle2 size={7} className="text-white" />}
                                    </button>
                                ))}
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 text-xs font-bold text-white/40 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => onSave(currentNote, currentColor)}
                                    disabled={isSaving}
                                    className="px-6 py-2 bg-white text-black rounded-xl text-xs font-bold hover:bg-white/90 disabled:opacity-50 transition-all shadow-lg active:scale-95"
                                >
                                    {isSaving ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

export default function SubmissionsList({ 
    submissions, loading, onViewCode, contestId, problemIndex, urlType, groupId 
}: SubmissionsListProps) {
    const [mode, setMode] = useState<'local' | 'global'>('local');
    const [globalSubmissions, setGlobalSubmissions] = useState<GlobalSubmission[]>([]);
    const [globalLoading, setGlobalLoading] = useState(false);
    const [globalError, setGlobalError] = useState(false);
    const [hoveredId, setHoveredId] = useState<number | null>(null);

    const fetchGlobal = useCallback(async () => {
        if (!contestId) return;
        setGlobalLoading(true);
        setGlobalError(false);
        try {
            const params = new URLSearchParams();
            params.set('contestId', contestId);
            if (problemIndex) params.set('problemIndex', problemIndex);
            if (urlType) params.set('urlType', urlType);
            if (groupId) params.set('groupId', groupId);

            const res = await fetch(`/api/codeforces/submissions?${params.toString()}`);
            const data = await res.json();
            if (Array.isArray(data)) setGlobalSubmissions(data);
        } catch (err) {
            setGlobalError(true);
        } finally {
            setGlobalLoading(false);
        }
    }, [contestId, problemIndex, urlType, groupId]);

    useEffect(() => {
        if (mode === 'global' && globalSubmissions.length === 0) fetchGlobal();
    }, [mode, globalSubmissions.length, fetchGlobal]);

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center gap-0 border-b border-white/[0.06] mb-1">
                <button onClick={() => setMode('local')} className={`relative px-4 py-2.5 text-xs font-medium transition-colors ${mode === 'local' ? 'text-white' : 'text-[#666] hover:text-[#999]'}`}>
                    Your Submissions
                    {mode === 'local' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E8C15A]" />}
                </button>
                <button onClick={() => setMode('global')} className={`relative px-4 py-2.5 text-xs font-medium transition-colors ${mode === 'global' ? 'text-white' : 'text-[#666] hover:text-[#999]'}`}>
                    Global Feed
                    {mode === 'global' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E8C15A]" />}
                </button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {mode === 'local' ? (
                    <LocalSubmissions submissions={submissions} loading={loading} onViewCode={onViewCode} hoveredId={hoveredId} setHoveredId={setHoveredId} />
                ) : (
                    <GlobalSubmissions submissions={globalSubmissions} loading={globalLoading} error={globalError} onRefresh={fetchGlobal} />
                )}
            </div>
        </div>
    );
}

function LocalSubmissions({ submissions, loading, onViewCode, hoveredId, setHoveredId }: any) {
    const [noteModalData, setNoteModalData] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [localNotes, setLocalNotes] = useState<Record<number, { notes: string; noteColor: string }>>({});

    const handleSaveNote = async (text: string, color: string) => {
        if (!noteModalData) return;
        setIsSaving(true);
        try {
            const res = await fetch(`/api/submissions/${noteModalData.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notes: text, noteColor: color })
            });
            if (res.ok) {
                // Update local overlay state so UI reflects the change immediately
                setLocalNotes(prev => ({ ...prev, [noteModalData.id]: { notes: text, noteColor: color } }));
            }
        } catch (error) {
            console.error('Failed to save note:', error);
        } finally {
            setIsSaving(false);
            setNoteModalData(null);
        }
    };

    // Merge server submissions with local note overrides
    const getNote = (sub: any) => localNotes[sub.id] || { notes: sub.notes, noteColor: sub.noteColor };

    if (loading) {
        return (
            <div className="flex flex-col space-y-1 p-1">
                <div className="grid grid-cols-[1fr_80px_80px_72px_120px_28px] gap-2 px-3 py-2 border-b border-white/[0.03]">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-12 ml-auto" />
                    <Skeleton className="h-3 w-12 ml-auto" />
                    <Skeleton className="h-3 w-10 ml-auto" />
                    <Skeleton className="h-3 w-12 ml-auto" />
                </div>
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="grid grid-cols-[1fr_80px_80px_72px_120px_28px] gap-2 px-3 py-3 items-center">
                        <Skeleton className="h-10 w-full rounded-lg bg-white/[0.02]" />
                    </div>
                ))}
            </div>
        );
    }

    if (submissions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
                <History className="text-[#333]" size={24} />
                <span className="text-xs text-[#555]">No submissions yet</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col">
            <div className="grid grid-cols-[1fr_80px_80px_72px_120px_28px] gap-2 px-4 py-2 text-[10px] font-bold text-[#444] uppercase tracking-wider border-b border-white/[0.03]">
                <span>Status</span>
                <span className="text-right">Runtime</span>
                <span className="text-right">Memory</span>
                <span className="text-right">Tests</span>
                <span className="pl-4">Notes</span>
                <span />
            </div>

            {submissions.map((sub: any, idx: number) => {
                const vType = getVerdictType(sub.verdict);
                const colors = verdictColors[vType];
                const isHovered = hoveredId === sub.id;

                return (
                    <div
                        key={sub.id}
                        onClick={() => onViewCode(sub.id)}
                        onMouseEnter={() => setHoveredId(sub.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        className={`group grid grid-cols-[1fr_80px_80px_72px_120px_28px] gap-2 items-center px-4 py-2.5 cursor-pointer transition-colors ${
                            isHovered ? 'bg-white/[0.03]' : idx % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.015]'
                        }`}
                    >
                        <div className="flex flex-col gap-0.5 min-w-0">
                            <div className="flex items-center gap-2">
                                {vType === 'accepted' ? <CheckCircle2 size={14} className="text-[#2cbb5d]" /> : vType === 'pending' ? <Timer size={14} className="text-[#ffa116]" /> : <XCircle size={14} className="text-[#ef4743]" />}
                                <span className={`text-sm font-medium truncate ${colors.text}`}>{formatVerdict(sub.verdict)}</span>
                            </div>
                            <span className="text-[10px] text-[#555] pl-[22px]">{timeAgo(sub.submittedAt)}</span>
                        </div>

                        <span className="text-xs text-[#999] text-right">{formatTime(sub.timeMs)}</span>
                        <span className="text-xs text-[#999] text-right">{formatMemory(sub.memoryKb)}</span>
                        
                        <span className="text-xs text-right tabular-nums">
                            <span className={vType === 'accepted' ? 'text-[#2cbb5d]' : 'text-[#999]'}>{sub.testCasesPassed || 0}</span>
                            <span className="text-[#444]">/{sub.totalTestCases || 0}</span>
                        </span>

                        <div className="pl-4 min-w-0" onClick={(e) => { e.stopPropagation(); setNoteModalData(sub); }}>
                            <div className="flex items-center gap-2 group/note cursor-text">
                                <span className={`text-[11px] truncate italic flex-1 ${getNote(sub).notes ? 'text-white/80' : 'text-[#444]'}`}>
                                    {getNote(sub).notes ? (
                                        <span className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: NOTE_COLORS.find(c => c.name === getNote(sub).noteColor)?.hex || '#444' }} />
                                            {getNote(sub).notes}
                                        </span>
                                    ) : 'Add note...'}
                                </span>
                                <Pencil size={10} className="text-[#444] opacity-0 group-hover/note:opacity-100 transition-opacity" />
                            </div>
                        </div>

                        <ChevronRight size={14} className={`transition-all ${isHovered ? 'text-[#999] translate-x-0.5' : 'text-[#333]'}`} />
                    </div>
                );
            })}

            <NotesModal
                isOpen={!!noteModalData}
                onClose={() => setNoteModalData(null)}
                note={noteModalData ? getNote(noteModalData).notes : ''}
                color={noteModalData ? getNote(noteModalData).noteColor : 'default'}
                onSave={handleSaveNote}
                isSaving={isSaving}
            />
        </div>
    );
}

function GlobalSubmissions({ submissions, loading, error, onRefresh }: any) {
    if (loading) return <div className="p-4"><Skeleton className="h-64 w-full rounded-xl bg-white/[0.02]" /></div>;
    if (error) return <div className="flex flex-col items-center justify-center py-16 gap-4"><AlertCircle className="text-[#ef4743]" size={24} /><p className="text-xs text-[#888]">Failed to load</p><button onClick={onRefresh} className="px-4 py-2 bg-white/5 rounded-lg text-xs"><RefreshCw size={14} /></button></div>;
    
    return (
        <div className="flex flex-col">
            <div className="grid grid-cols-[1fr_90px_72px_72px] gap-2 px-4 py-2 text-[10px] font-bold text-[#444] uppercase tracking-wider border-b border-white/[0.03]">
                <span>Author</span>
                <span className="text-right">Time</span>
                <span className="text-right">Memory</span>
                <span className="text-right">Lang</span>
            </div>
            {submissions.map((sub: any, idx: number) => {
                const colors = verdictColors[getVerdictType(sub.verdict)];
                return (
                    <div key={sub.id} className={`grid grid-cols-[1fr_90px_72px_72px] gap-2 items-center px-4 py-2.5 ${idx % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.015]'}`}>
                        <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-[#E8C15A] truncate">{sub.author}</span>
                            <span className={`text-[10px] font-medium ${colors.text}`}>{formatVerdict(sub.verdict)}</span>
                        </div>
                        <span className="text-[10px] text-[#888] text-right">{formatTime(sub.timeConsumedMillis)}</span>
                        <span className="text-[10px] text-[#888] text-right">{formatMemory(sub.memoryConsumedBytes / 1024)}</span>
                        <span className="text-[10px] text-[#666] text-right truncate">{sub.language}</span>
                    </div>
                );
            })}
        </div>
    );
}
