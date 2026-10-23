'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldAlert, RefreshCw, Users, ClipboardPaste, GitCompare, X, Loader2, Info, ChevronDown, ChevronRight } from 'lucide-react';

type Reason = 'identical' | 'rare_names' | 'rare_solution';
interface StudentRef { userId: number; name: string; studentId: string; group: string | null }
interface PairProblem { contestId: string; problem: string; label: string; similarity: number; reasons: Reason[]; rareNames: string[]; solvers: number; sameCount: number }
interface PairCase { a: StudentRef; b: StudentRef; problems: PairProblem[]; score: number; level: 'high' | 'medium' | 'low' }
interface BehaviourCase { student: StudentRef; pastedProblems: { contestId: string; problem: string; label: string; chars: number; keystrokes: number; activeSeconds: number }[] }
interface Report {
    generatedAt: string;
    stats: { codes: number; problems: number; students: number };
    pairs: PairCase[];
    rings: { members: StudentRef[]; problems: number }[];
    behaviour: BehaviourCase[];
}

const LEVEL_STYLE: Record<PairCase['level'], string> = {
    high: 'bg-red-500/15 text-red-400 border-red-500/30',
    medium: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    low: 'bg-white/5 text-white/50 border-white/10',
};

function reasonText(p: PairProblem, r: Reason): string {
    if (r === 'identical') return 'Identical code (names and layout)';
    if (r === 'rare_names') return `Same rare variable names: ${p.rareNames.join(', ')}`;
    return `Unusual solution: only ${p.sameCount} of ${p.solvers} students wrote it`;
}

function Person({ s }: { s: StudentRef }) {
    const masked = !s.studentId && s.name === 'Another student';
    const body = (
        <span className="inline-flex flex-col min-w-0">
            <span className={`text-sm font-semibold truncate ${masked ? 'text-white/50 italic' : 'text-white'}`}>{s.name}</span>
            <span className="text-[11px] text-white/40 font-mono truncate">
                {s.studentId || '—'}{s.group ? ` · ${s.group}` : ''}
            </span>
        </span>
    );
    return masked ? body : <Link href={`/dashboard/mentor/${s.userId}`} className="hover:underline min-w-0">{body}</Link>;
}

export default function IntegrityPage() {
    const [report, setReport] = useState<Report | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tab, setTab] = useState<'pairs' | 'groups' | 'pasted'>('pairs');
    const [level, setLevel] = useState<'all' | 'high' | 'medium'>('all');
    const [search, setSearch] = useState('');
    const [open, setOpen] = useState<string | null>(null);
    const [compare, setCompare] = useState<{ pair: PairCase; problem: PairProblem } | null>(null);

    const load = useCallback(async (refresh = false) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/mentor/integrity${refresh ? '?refresh=1' : ''}`, { credentials: 'include' });
            if (!res.ok) throw new Error(res.status === 403 ? 'You do not have mentor access.' : 'Could not build the report.');
            setReport(await res.json());
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not build the report.');
        } finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { load(); }, [load]);

    const q = search.trim().toLowerCase();
    const matches = (s: StudentRef) => !q || s.name.toLowerCase().includes(q) || s.studentId.includes(q);
    const pairs = useMemo(() => (report?.pairs || [])
        .filter((p) => level === 'all' ? p.level !== 'low' : p.level === level)
        .filter((p) => matches(p.a) || matches(p.b)), [report, level, q]); // eslint-disable-line react-hooks/exhaustive-deps
    const behaviour = useMemo(() => (report?.behaviour || []).filter((b) => matches(b.student)), [report, q]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="min-h-screen bg-[#0B0B0C] text-white p-4 md:p-8 space-y-6 max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
                <div>
                    <Link href="/dashboard/mentor" className="inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white mb-3">
                        <ArrowLeft size={14} /> Mentor Command Center
                    </Link>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20"><ShieldAlert size={20} /></div>
                        <h1 className="text-xl md:text-2xl font-bold tracking-tight">Code Integrity</h1>
                    </div>
                    <p className="text-xs text-white/50 max-w-2xl">
                        Students whose submitted code matches in ways that are unlikely by chance, and solutions that were pasted rather than typed.
                    </p>
                </div>
                <button
                    onClick={() => load(true)}
                    disabled={loading}
                    className="self-start md:self-auto inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#121214] border border-white/10 text-xs text-white/70 hover:text-white disabled:opacity-50"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Re-check all code
                </button>
            </div>

            <div className="flex gap-3 p-4 rounded-2xl bg-[#E8C15A]/5 border border-[#E8C15A]/20 text-xs text-white/70 leading-relaxed">
                <Info size={16} className="text-[#E8C15A] shrink-0 mt-0.5" />
                <p>
                    This points you to where to look; it is not proof. Easy problems have one obvious solution, so a match only counts when it is rare:
                    identical code few others wrote, the same unusual variable names, or an unusual solution shared by a small group. A pair matching on
                    many problems is the strongest sign. Talk to the student, or ask them to solve one of the problems live, before deciding anything.
                </p>
            </div>

            {report && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        ['Solutions checked', report.stats.codes],
                        ['Problems', report.stats.problems],
                        ['Matching pairs', report.pairs.filter((p) => p.level !== 'low').length],
                        ['Pasted-code students', report.behaviour.length],
                    ].map(([label, value]) => (
                        <div key={label as string} className="p-4 rounded-2xl bg-[#121214]/90 border border-white/[0.08]">
                            <span className="text-[11px] text-white/40 uppercase tracking-wider">{label}</span>
                            <span className="text-2xl font-bold mt-1 block">{value}</span>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
                <div className="flex gap-1 p-1 rounded-xl bg-[#121214] border border-white/[0.08] self-start">
                    {([['pairs', 'Matching code', GitCompare], ['groups', 'Groups', Users], ['pasted', 'Pasted code', ClipboardPaste]] as const).map(([id, label, Icon]) => (
                        <button key={id} onClick={() => setTab(id)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${tab === id ? 'bg-[#E8C15A]/15 text-[#E8C15A]' : 'text-white/50 hover:text-white'}`}>
                            <Icon size={14} /> {label}
                        </button>
                    ))}
                </div>
                <div className="flex gap-2">
                    {tab === 'pairs' && (
                        <select value={level} onChange={(e) => setLevel(e.target.value as typeof level)}
                            className="bg-[#0B0B0C] border border-white/10 text-white text-xs rounded-xl px-3 py-2">
                            <option value="all">High + medium</option>
                            <option value="high">High only</option>
                            <option value="medium">Medium only</option>
                        </select>
                    )}
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or ID…"
                        className="bg-[#0B0B0C] border border-white/10 rounded-xl px-3 py-2 text-xs w-48 placeholder-white/30 focus:outline-none focus:border-[#E8C15A]" />
                </div>
            </div>

            {loading && !report && (
                <div className="flex items-center gap-2 text-sm text-white/50 py-16 justify-center"><Loader2 size={16} className="animate-spin" /> Comparing all submitted code…</div>
            )}
            {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">{error}</div>}

            {report && tab === 'pairs' && (
                <div className="space-y-3">
                    {pairs.length === 0 && <p className="text-sm text-white/40 py-10 text-center">No matching code found.</p>}
                    {pairs.map((p) => {
                        const key = `${p.a.userId}~${p.b.userId}`;
                        const isOpen = open === key;
                        return (
                            <div key={key} className="rounded-2xl bg-[#121214]/90 border border-white/[0.08] overflow-hidden">
                                <button onClick={() => setOpen(isOpen ? null : key)} className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/[0.02]">
                                    {isOpen ? <ChevronDown size={16} className="text-white/40 shrink-0" /> : <ChevronRight size={16} className="text-white/40 shrink-0" />}
                                    <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase shrink-0 ${LEVEL_STYLE[p.level]}`}>{p.level}</span>
                                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0">
                                        <Person s={p.a} />
                                        <Person s={p.b} />
                                    </div>
                                    <span className="text-xs text-white/60 shrink-0 text-right">
                                        <span className="text-lg font-bold text-white block leading-none">{p.problems.length}</span>
                                        problem{p.problems.length === 1 ? '' : 's'}
                                    </span>
                                </button>
                                {isOpen && (
                                    <div className="border-t border-white/[0.06] divide-y divide-white/[0.04]">
                                        {p.problems.map((pr) => (
                                            <div key={`${pr.contestId}:${pr.problem}`} className="flex flex-col md:flex-row md:items-center gap-2 px-4 py-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm text-white/90 truncate">{pr.label}</div>
                                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                                        {pr.reasons.map((r) => (
                                                            <span key={r} className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[11px] text-white/60">{reasonText(pr, r)}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <span className="text-xs font-mono text-white/50 shrink-0">{Math.round(pr.similarity * 100)}% same structure</span>
                                                <button onClick={() => setCompare({ pair: p, problem: pr })}
                                                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E8C15A]/10 border border-[#E8C15A]/30 text-xs text-[#E8C15A] hover:bg-[#E8C15A]/20">
                                                    <GitCompare size={13} /> Compare code
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {report && tab === 'groups' && (
                <div className="space-y-3">
                    {report.rings.length === 0 && <p className="text-sm text-white/40 py-10 text-center">No groups of 3+ students sharing code across several problems.</p>}
                    {report.rings.map((r, i) => (
                        <div key={i} className="p-4 rounded-2xl bg-[#121214]/90 border border-red-500/20">
                            <div className="text-xs text-white/50 mb-3">
                                {r.members.length} students whose code matches each other on {r.problems} problems
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                {r.members.map((m) => <Person key={m.userId} s={m} />)}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {report && tab === 'pasted' && (
                <div className="space-y-3">
                    <p className="text-xs text-white/40">
                        Solutions of 150+ characters that appeared in the ICPC HUE editor with almost no typing (pasted in). Writing code in another editor
                        and pasting it is normal; it matters together with matching code, very short time on the problem, or no failed attempts.
                    </p>
                    {behaviour.length === 0 && <p className="text-sm text-white/40 py-10 text-center">No students with 3+ pasted solutions.</p>}
                    {behaviour.map((b) => {
                        const key = `b${b.student.userId}`;
                        const isOpen = open === key;
                        return (
                            <div key={key} className="rounded-2xl bg-[#121214]/90 border border-white/[0.08] overflow-hidden">
                                <button onClick={() => setOpen(isOpen ? null : key)} className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/[0.02]">
                                    {isOpen ? <ChevronDown size={16} className="text-white/40" /> : <ChevronRight size={16} className="text-white/40" />}
                                    <div className="flex-1 min-w-0"><Person s={b.student} /></div>
                                    <span className="text-xs text-white/60 text-right">
                                        <span className="text-lg font-bold text-white block leading-none">{b.pastedProblems.length}</span>pasted
                                    </span>
                                </button>
                                {isOpen && (
                                    <div className="border-t border-white/[0.06] divide-y divide-white/[0.04]">
                                        {b.pastedProblems.map((pp) => (
                                            <div key={`${pp.contestId}:${pp.problem}`} className="flex items-center gap-3 px-4 py-2.5 text-xs">
                                                <span className="flex-1 text-white/80 truncate">{pp.label}</span>
                                                <span className="text-white/50 font-mono">{pp.chars} chars</span>
                                                <span className="text-white/50 font-mono">{pp.keystrokes} keys typed</span>
                                                <span className="text-white/50 font-mono w-20 text-right">{Math.round(pp.activeSeconds)}s on page</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {report && <p className="text-[11px] text-white/30">Checked {new Date(report.generatedAt).toLocaleString()} · refreshed every 10 minutes</p>}

            {compare && <CompareModal pair={compare.pair} problem={compare.problem} onClose={() => setCompare(null)} />}
        </div>
    );
}

function CompareModal({ pair, problem, onClose }: { pair: PairCase; problem: PairProblem; onClose: () => void }) {
    const [codes, setCodes] = useState<{ a: string | null; b: string | null } | null>(null);
    const [failed, setFailed] = useState(false);
    useEffect(() => {
        const params = new URLSearchParams({ a: String(pair.a.userId), b: String(pair.b.userId), contest: problem.contestId, p: problem.problem });
        fetch(`/api/mentor/integrity/code?${params}`, { credentials: 'include' })
            .then((r) => (r.ok ? r.json() : Promise.reject()))
            .then(setCodes)
            .catch(() => setFailed(true));
    }, [pair, problem]);

    // Lines present in both versions (ignoring spacing) are highlighted.
    const shared = useMemo(() => {
        if (!codes?.a || !codes?.b) return new Set<string>();
        const bLines = new Set(codes.b.split('\n').map(norm).filter((l) => l.length > 3));
        return new Set(codes.a.split('\n').map(norm).filter((l) => l.length > 3 && bLines.has(l)));
    }, [codes]);

    return (
        <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3" onClick={onClose}>
            <div className="w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl bg-[#0F0F10] border border-white/10 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
                    <GitCompare size={16} className="text-[#E8C15A]" />
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">{problem.label}</div>
                        <div className="text-[11px] text-white/40">Highlighted lines appear in both solutions · {Math.round(problem.similarity * 100)}% same structure</div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10"><X size={16} /></button>
                </div>
                {failed && <div className="p-6 text-sm text-red-400">Could not load the code.</div>}
                {!codes && !failed && <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-white/40" /></div>}
                {codes && (
                    <div className="flex-1 min-h-0 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-white/10 overflow-hidden">
                        <Pane who={pair.a} code={codes.a} shared={shared} />
                        <Pane who={pair.b} code={codes.b} shared={shared} />
                    </div>
                )}
            </div>
        </div>
    );
}

const norm = (l: string) => l.replace(/\s+/g, '');

function Pane({ who, code, shared }: { who: StudentRef; code: string | null | undefined; shared: Set<string> }) {
    return (
        <div className="flex-1 min-w-0 flex flex-col">
            <div className="px-3 py-2 border-b border-white/10 bg-[#161618]"><Person s={who} /></div>
            <pre className="flex-1 overflow-auto p-3 text-[12px] leading-5 font-mono">
                {code == null ? <span className="text-white/40">No saved code for this problem.</span> : code.split('\n').map((line, i) => (
                    <div key={i} className={shared.has(norm(line)) && norm(line).length > 3 ? 'bg-red-500/10 text-red-100' : 'text-white/70'}>{line || ' '}</div>
                ))}
            </pre>
        </div>
    );
}
